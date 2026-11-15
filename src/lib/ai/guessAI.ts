/**
 * GuessWhat 纯客户端 AI 驱动服务
 * 
 * 架构特性：
 * 1. 100% 浏览器客户端直连（纯静态 Next.js 兼容，零 Node.js 服务端路由依赖）；
 * 2. 跨平台密钥支持：优先读取用户在设置弹窗中保存在 localStorage 的密钥，未设置时回退读取 NEXT_PUBLIC_* 环境变量；
 * 3. 兼容双大模型协议：Google Gemini (官方 REST API) 与 OpenAI / DeepSeek (REST API)；
 * 4. 内置离线降级策略：在无网络或未配置 API Key 时，思路评估等功能可自动切换为启发式规则，保障核心游戏体验不中断。
 */

export type AIProvider = 'gemini' | 'openai' | 'none';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  model: string;
}

export interface AICandidateWord {
  name: string;
  note: string;
  difficulty?: string;
}

export interface AIRecommendation {
  questions: Array<{ question: string; rationale: string }>;
}

export interface AIStageHint {
  direction: string;
  hint: string;
}

export type OffTrackStatus = 'effective' | 'possible_off_track' | 'insufficient_info';

export interface AIOffTrackResult {
  status: OffTrackStatus;
  rationale: string;
}

export interface AIFactCheckResult {
  suggestedAnswer: 'yes' | 'no' | 'uncertain';
  explanation: string;
}

const STORAGE_KEY = 'duo_guess_ai_config';

/**
 * 获取当前 AI 配置
 */
export function getAIConfig(): AIConfig {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AIConfig>;
        if (parsed.apiKey && parsed.apiKey.trim()) {
          const provider: AIProvider = parsed.provider || (parsed.apiKey.startsWith('sk-') ? 'openai' : 'gemini');
          return {
            provider,
            apiKey: parsed.apiKey.trim(),
            baseUrl: parsed.baseUrl?.trim(),
            model: parsed.model?.trim() || (provider === 'openai' ? 'deepseek-chat' : 'gemini-2.5-flash'),
          };
        }
      }
    } catch {
      // 忽略 localStorage 解析异常
    }
  }

  // 回退环境变量
  const geminiEnv = process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim();
  const openaiEnv = (process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY)?.trim();

  if (openaiEnv) {
    const baseUrl = process.env.NEXT_PUBLIC_OPENAI_BASE_URL?.trim() || 'https://api.deepseek.com';
    const isDeepSeek = baseUrl.includes('deepseek');
    return {
      provider: 'openai',
      apiKey: openaiEnv,
      baseUrl,
      model: process.env.NEXT_PUBLIC_OPENAI_MODEL?.trim() || (isDeepSeek ? 'deepseek-chat' : 'gpt-4o-mini'),
    };
  }

  if (geminiEnv) {
    return {
      provider: 'gemini',
      apiKey: geminiEnv,
      baseUrl: process.env.NEXT_PUBLIC_GEMINI_BASE_URL?.trim(),
      model: process.env.NEXT_PUBLIC_GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
    };
  }

  return {
    provider: 'none',
    apiKey: '',
    model: 'none',
  };
}

/**
 * 保存 AI 配置到浏览器 localStorage
 */
export function saveAIConfig(config: {
  provider: AIProvider;
  apiKey: string;
  baseUrl?: string;
  model?: string;
}): void {
  if (typeof window === 'undefined') return;
  const cleaned: AIConfig = {
    provider: config.provider,
    apiKey: config.apiKey.trim(),
    baseUrl: config.baseUrl?.trim() || undefined,
    model: config.model?.trim() || (config.provider === 'openai' ? 'deepseek-chat' : 'gemini-2.5-flash'),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
}

/**
 * 清理本地存储的 AI 配置
 */
export function clearAIConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 判断是否已配置可用 AI
 */
export function isAIConfigured(): boolean {
  const config = getAIConfig();
  return config.provider !== 'none' && !!config.apiKey;
}

/**
 * 获取友好的模型展示名称
 */
export function getAIModelDisplayName(): string {
  const config = getAIConfig();
  if (config.provider === 'openai') {
    if (config.model.includes('deepseek')) return 'DeepSeek';
    return config.model;
  }
  if (config.provider === 'gemini') {
    return 'Google Gemini';
  }
  return '未配置';
}

function cleanJsonOutput(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

/**
 * 统一大模型纯前端请求分发器
 */
async function callLLM(systemPrompt: string, userPrompt: string, temperature = 0.7): Promise<string> {
  const config = getAIConfig();

  if (!config.apiKey || config.provider === 'none') {
    throw new Error('未配置 API Key，请点击右上角设置按钮填入 Gemini 或 DeepSeek 密钥');
  }

  // 1. OpenAI / DeepSeek REST 接口
  if (config.provider === 'openai') {
    const baseUrl = (config.baseUrl || 'https://api.deepseek.com').replace(/\/+$/, '');
    const endpoint = `${baseUrl}/chat/completions`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (res.status === 401) {
        throw new Error('API Key 鉴权失败 (401)，请检查密钥是否完整或余额是否充足');
      }
      throw new Error(`AI 请求失败 (${res.status}): ${errText.slice(0, 150)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('大模型未返回有效文本');
    return cleanJsonOutput(content);
  }

  // 2. Google Gemini REST 接口
  if (config.provider === 'gemini') {
    const model = config.model || 'gemini-2.5-flash';
    const baseUrl = config.baseUrl?.replace(/\/+$/, '') || 'https://generativelanguage.googleapis.com';
    const endpoint = `${baseUrl}/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      if (res.status === 400 || res.status === 403) {
        throw new Error(`Gemini 权限或密钥无效 (${res.status})，建议使用 DeepSeek 或重新生成 Gemini Key`);
      }
      throw new Error(`Gemini 请求失败 (${res.status}): ${errText.slice(0, 150)}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini 未返回有效数据');
    return cleanJsonOutput(text);
  }

  throw new Error('未支持的大模型服务商');
}

/**
 * 格式化已回答的公开问答
 */
function formatPublicQA(questions: Array<{ text: string; answer?: string | null }>): string {
  const answered = questions.filter((q) => !!q.answer);
  if (answered.length === 0) return '暂无历史提问。';
  const map: Record<string, string> = { yes: '【是】', no: '【不是】', uncertain: '【不确定】' };
  return answered
    .map((q, i) => `${i + 1}. 问题: "${q.text}" -> 回答: ${map[q.answer || ''] || '未知'}`)
    .join('\n');
}

/**
 * 1. 猜题人：推荐下一问
 */
export async function generateQuestionRecommendations(params: {
  theme: string;
  questions: Array<{ text: string; answer?: string | null }>;
}): Promise<AIRecommendation> {
  const qaHistory = formatPublicQA(params.questions);
  const systemPrompt = `你是一款双人实时猜词游戏（二十问/海龟汤）的猜词辅助 AI。
猜词方试图推断出秘密词语。你不知道秘密词语是什么。
请根据公开的问答历史，给出 3 个高信息增益的二分是非问题。必须可用「是」、「不是」或「不确定」明确回答，不可直接猜具体词。`;

  const userPrompt = `主题: ${params.theme}
历史问答:
${qaHistory}

请返回严格 JSON：
{
  "questions": [
    { "question": "它是活着的生物吗？", "rationale": "通过生物属性快速排查大类" },
    { "question": "它常见于家庭室内吗？", "rationale": "界定出现场景" },
    { "question": "它的尺寸比成年人更大吗？", "rationale": "缩小体型尺度" }
  ]
}`;

  const jsonStr = await callLLM(systemPrompt, userPrompt, 0.7);
  const parsed = JSON.parse(jsonStr);
  const list = parsed.questions || [];
  return {
    questions: list.slice(0, 3).map((item: any) => ({
      question: String(item.question || '').trim(),
      rationale: String(item.rationale || '').trim(),
    })),
  };
}

/**
 * 2. 猜题人：阶段启发提示
 */
export async function generateStageHint(params: {
  theme: string;
  questions: Array<{ text: string; answer?: string | null }>;
}): Promise<AIStageHint> {
  const qaHistory = formatPublicQA(params.questions);
  const systemPrompt = `你是一款双人猜词游戏的启发式助手。
猜词方正在寻找突破方向。请从宏观属性（如用途、出现场景、材质、年代等）给出一句启发。不得泄露具体词语。`;

  const userPrompt = `主题: ${params.theme}
历史问答:
${qaHistory}

请返回严格 JSON：
{
  "direction": "建议探索维度（例如：使用场景或功能用途）",
  "hint": "目前的提问主要集中在物理外观，可以尝试询问它的功能用途或使用频次。"
}`;

  const jsonStr = await callLLM(systemPrompt, userPrompt, 0.7);
  const parsed = JSON.parse(jsonStr);
  return {
    direction: String(parsed.direction || '特征探索'),
    hint: String(parsed.hint || '可以尝试从使用场景或功能方向展开提问。'),
  };
}

/**
 * 3. 启发式离线规则偏航评估
 */
function heuristicOffTrack(questions: Array<{ text: string; answer?: string | null }>): AIOffTrackResult {
  const answered = questions.filter((q) => !!q.answer);
  if (answered.length < 2) {
    return {
      status: 'insufficient_info',
      rationale: '当前已完成问答较少，请继续自由提问。',
    };
  }
  if (answered.length >= 3) {
    const recent3 = answered.slice(-3);
    if (recent3.every((q) => q.answer === 'no')) {
      return {
        status: 'possible_off_track',
        rationale: '最近连续 3 题均为否定回答，当前细分方向可能已到死胡同，建议跳出当前维度重新划定范围。',
      };
    }
  }
  const uncertainCount = answered.filter((q) => q.answer === 'uncertain').length;
  if (uncertainCount >= 2) {
    return {
      status: 'possible_off_track',
      rationale: '多次得到「不确定」回答，说明当前维度较难界定，建议换成更明确客观的标准。',
    };
  }
  return {
    status: 'effective',
    rationale: '提问逻辑稳步推进中，继续保持当前探索节奏。',
  };
}

/**
 * 4. 猜题人：提问偏航预警评估
 */
export async function evaluateOffTrackWarning(params: {
  theme: string;
  questions: Array<{ text: string; answer?: string | null }>;
}): Promise<AIOffTrackResult> {
  if (!isAIConfigured()) {
    return heuristicOffTrack(params.questions);
  }

  const qaHistory = formatPublicQA(params.questions);
  const systemPrompt = `你是一名逻辑与推理策略评估专家。请分析双人猜词游戏中猜词人目前的提问策略。
有效推进返回 "effective"；如果明显钻牛角尖或连续撞墙返回 "possible_off_track"；问答过少返回 "insufficient_info"。`;

  const userPrompt = `主题: ${params.theme}
历史问答:
${qaHistory}

请返回严格 JSON：
{
  "status": "effective" | "possible_off_track" | "insufficient_info",
  "rationale": "简短判定依据"
}`;

  try {
    const jsonStr = await callLLM(systemPrompt, userPrompt, 0.3);
    const parsed = JSON.parse(jsonStr);
    const valid = ['effective', 'possible_off_track', 'insufficient_info'];
    const status = valid.includes(parsed.status) ? parsed.status : 'insufficient_info';
    return {
      status: status as OffTrackStatus,
      rationale: String(parsed.rationale || '保持当前探索思路即可。'),
    };
  } catch {
    return heuristicOffTrack(params.questions);
  }
}

/**
 * 5. 出题人：AI 灵感题库生成
 */
export async function generateWordCandidates(params: {
  theme: string;
  count?: number;
}): Promise<AICandidateWord[]> {
  const count = params.count || 4;
  const systemPrompt = `你是一款双人实时猜词游戏的题目设计专家。
请根据出题人指定的主题，生成一组富有创意、特征鲜明且适合二十问二分探索的词条。同一批词条不可重复。`;

  const userPrompt = `主题: ${params.theme}
数量: ${count} 个

要求：
1. 词条贴合分类，具有趣味性与辨识度；
2. 每个词条附带 10~25 字生动的提示/注释 (note)。

请返回严格 JSON：
{
  "words": [
    { "name": "北极熊", "note": "生活在极北冰原上的庞然巨兽" }
  ]
}`;

  const jsonStr = await callLLM(systemPrompt, userPrompt, 0.85);
  const parsed = JSON.parse(jsonStr);
  const list = parsed.words || parsed.candidates || [];
  return list.slice(0, count).map((item: any) => ({
    name: String(item.name || '').trim(),
    note: String(item.note || '').trim(),
  }));
}

/**
 * 6. 出题人：事实查证助手
 */
export async function verifyQuestionFact(params: {
  secretWord: string;
  theme: string;
  questionText: string;
}): Promise<AIFactCheckResult> {
  const systemPrompt = `你是一名严谨的百科事实查证助手。
在猜词游戏中，出题人设定的秘密词条是【${params.secretWord}】（分类：${params.theme}）。
猜词人提出了一个是非问题。你需要帮助出题人客观核实事实。`;

  const userPrompt = `秘密词条: ${params.secretWord}
分类: ${params.theme}
猜词人问题: "${params.questionText}"

请判断该问题针对此秘密词条的答案应当是「是(yes)」、「不是(no)」还是「不确定/因情况而异(uncertain)」，并给出简明事实依据。

请返回严格 JSON：
{
  "suggestedAnswer": "yes" | "no" | "uncertain",
  "explanation": "简要事实依据（30字以内）"
}`;

  const jsonStr = await callLLM(systemPrompt, userPrompt, 0.2);
  const parsed = JSON.parse(jsonStr);
  const valid = ['yes', 'no', 'uncertain'];
  const suggestedAnswer = valid.includes(parsed.suggestedAnswer) ? parsed.suggestedAnswer : 'uncertain';
  return {
    suggestedAnswer: suggestedAnswer as 'yes' | 'no' | 'uncertain',
    explanation: String(parsed.explanation || '请根据常识做出判断。'),
  };
}

export interface AIDrawCandidateWord {
  name: string;
  theme: string;
  drawHint: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * 7. 你画我猜：AI 智能生成适合手绘与竞猜的具象词条（具备历史排重能力）
 */
export async function generateDrawWordCandidates(params: {
  theme?: string;
  count?: number;
  excludeWords?: string[];
}): Promise<AIDrawCandidateWord[]> {
  const count = params.count || 4;
  const themeDesc =
    params.theme && params.theme !== '全部'
      ? `所属分类范围：【${params.theme}】。`
      : '涵盖水果、动物、日常用品、食物、交通建筑、自然等丰富类目。';
  const excludeText =
    params.excludeWords && params.excludeWords.length > 0
      ? `\n必须排除以下近期已经出现过的词条，绝不可重复：${params.excludeWords.slice(-50).join('、')}。`
      : '';

  const systemPrompt = `你是一款双人实时在线“你画我猜”游戏的资深出题专家。
你的任务是为画师生成一组极富画面感、特征直观、易于通过简单线条与颜色画出并供对方竞猜的词条。同一批词条内部绝对不可同名。`;

  const userPrompt = `【出题要求】
1. ${themeDesc}
2. 数量：生成恰好 ${count} 个互不相同的新词条。
3. 纯具象原则：必须是具体有形、可用简单画笔表现的物体（例如：水杯、小黄鸭、热气球、汉堡包、向日葵等），严禁抽象哲学概念（如“自由”、“时间”、“悲伤”等难以画出的词汇）。
4. 词长限制：词语长度严格为 2 到 4 个汉字。
5. 作画线索提示 (drawHint)：为每个词提供 15 字以内的趣味半程提示（例如：“一种两片圆面包夹肉饼的快餐”）。
6. 难度设定：默认适合普通玩家作画，兼顾辨识度与趣味性。${excludeText}

请严格返回如下 JSON 格式：
{
  "words": [
    {
      "name": "长颈鹿",
      "theme": "动物",
      "drawHint": "一种脖子极长的高大非洲动物",
      "difficulty": "easy"
    }
  ]
}`;

  const jsonStr = await callLLM(systemPrompt, userPrompt, 0.85);
  const parsed = JSON.parse(jsonStr);
  const list = parsed.words || parsed.candidates || [];

  const seen = new Set<string>();
  const results: AIDrawCandidateWord[] = [];

  for (const item of list) {
    const name = String(item.name || '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    results.push({
      name,
      theme: String(item.theme || params.theme || '生活').trim(),
      drawHint: String(item.drawHint || `一种常见的${item.theme || '事物'}`).trim(),
      difficulty: 'easy',
    });
    if (results.length >= count) break;
  }

  return results;
}

