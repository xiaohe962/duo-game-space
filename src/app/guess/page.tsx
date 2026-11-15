'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePairAuth } from '@/context/PairAuthContext';
import {
  THEMES,
  ThemeType,
  getRandomWords,
  WordItem,
} from '@/lib/data/wordBank';
import {
  GuessSession,
  GuessQuestion,
  GuessRecord,
  AnswerType,
} from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { soundEffects } from '@/lib/audio/sound';
import confetti from 'canvas-confetti';
import {
  HelpCircle,
  Sparkles,
  Send,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HelpCircle as QuestionIcon,
  Trophy,
  ArrowRight,
  User,
  Lightbulb,
  MessageCircle,
  Flag,
  AlertTriangle,
  Settings,
  Compass,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import AISettingsModal from '@/components/guess/AISettingsModal';
import {
  isAIConfigured,
  getAIModelDisplayName,
  generateQuestionRecommendations,
  generateStageHint,
  evaluateOffTrackWarning,
  generateWordCandidates,
  verifyQuestionFact,
  AIFactCheckResult,
  AIOffTrackResult,
} from '@/lib/ai/guessAI';

export default function GuessPage() {
  const router = useRouter();
  const { pairCode, userId, nickname, room, isPaired, isHost, partnerNickname, isLoading } = usePairAuth();

  // 会话状态
  const [session, setSession] = useState<GuessSession | null>(null);
  const [questions, setQuestions] = useState<GuessQuestion[]>([]);
  const [records, setRecords] = useState<GuessRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // 出题选题面板状态
  const [selectedTheme, setSelectedTheme] = useState<string>('日常物品');
  const [candidateWords, setCandidateWords] = useState<WordItem[]>([]);
  const [customWord, setCustomWord] = useState('');

  // 猜词人输入框
  const [questionInput, setQuestionInput] = useState('');
  const [guessInput, setGuessInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI 弹窗与状态
  const [showAISettings, setShowAISettings] = useState(false);
  const [aiModelName, setAiModelName] = useState<string>('未配置');
  const [showAIAssistant, setShowAIAssistant] = useState(true);
  const [aiLoading, setAILoading] = useState(false);
  const [aiWordsLoading, setAiWordsLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<
    Array<{ question: string; rationale: string }> | null
  >(null);
  const [stageHint, setStageHint] = useState<{ direction: string; hint: string } | null>(null);
  const [offTrackResult, setOffTrackResult] = useState<AIOffTrackResult | null>(null);
  const [factChecks, setFactChecks] = useState<
    Record<string, { loading: boolean; result?: AIFactCheckResult; error?: string }>
  >({});

  // 快捷问题预设
  const QUICK_QUESTIONS = [
    '这是活的生物吗？',
    '这是日常生活中常见的人造物品吗？',
    '体积比一个篮球大吗？',
    '在家里或者办公室常见吗？',
    '和吃的东西或美食有关吗？',
    '它的价格通常很昂贵吗？',
  ];

  // 角色判定
  const hostId = `pair_${pairCode}_host`;
  const guestId = `pair_${pairCode}_guest`;
  const isMaster = session
    ? session.master_id === userId ||
      (session.master_id.includes('host') && isHost) ||
      (session.master_id.includes('guest') && !isHost)
    : isHost;
  const myRoleName = isMaster ? '出题人 (回答 是/否)' : '猜词人 (提问与竞猜)';

  useEffect(() => {
    if (!isLoading && !pairCode) {
      router.replace('/');
    }
  }, [isLoading, pairCode, router]);

  const refreshAIStatus = useCallback(() => {
    setAiModelName(getAIModelDisplayName());
  }, []);

  useEffect(() => {
    refreshAIStatus();
  }, [refreshAIStatus]);

  const initOrFetchSession = useCallback(async () => {
    if (!pairCode) return;

    if (!isSupabaseConfigured) {
      const localWords = getRandomWords(4, selectedTheme);
      setCandidateWords(localWords);
      const mockSession: GuessSession = {
        id: 'mock-guess-session',
        pair_code: pairCode,
        round_number: 1,
        status: 'word_selection',
        master_id: hostId,
        guesser_id: guestId,
        theme: selectedTheme,
        secret_word: null,
        secret_word_category: null,
        secret_word_note: null,
        questions_count: 0,
        wrong_guesses_count: 0,
        result: null,
        created_at: new Date().toISOString(),
        ended_at: null,
      };
      setSession(mockSession);
      setLoading(false);
      return;
    }

    try {
      const { data: activeSession } = await supabase
        .from('guess_sessions')
        .select('*')
        .eq('pair_code', pairCode)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSession) {
        const isRecognizedMaster =
          activeSession.master_id === hostId ||
          activeSession.master_id === guestId ||
          activeSession.master_id.includes('host') ||
          activeSession.master_id.includes('guest');

        let sessionObj = activeSession as GuessSession;
        if (!isRecognizedMaster && activeSession.status === 'word_selection') {
          sessionObj = {
            ...sessionObj,
            master_id: hostId,
            guesser_id: guestId,
          };
          supabase
            .from('guess_sessions')
            .update({ master_id: hostId, guesser_id: guestId })
            .eq('id', activeSession.id);
        }

        setSession(sessionObj);
        const { data: qList } = await supabase
          .from('guess_questions')
          .select('*')
          .eq('session_id', activeSession.id)
          .order('question_number', { ascending: true });
        setQuestions((qList as GuessQuestion[]) || []);

        const { data: rList } = await supabase
          .from('guess_records')
          .select('*')
          .eq('session_id', activeSession.id)
          .order('created_at', { ascending: true });
        setRecords((rList as GuessRecord[]) || []);
      } else {
        const { data: newSession } = await supabase
          .from('guess_sessions')
          .insert({
            pair_code: pairCode,
            round_number: 1,
            status: 'word_selection',
            master_id: hostId,
            guesser_id: guestId,
            theme: selectedTheme,
          })
          .select()
          .single();

        if (newSession) {
          setSession(newSession as GuessSession);
        }
      }
    } catch (e) {
      console.error('拉取 GuessWhat 会话失败:', e);
    } finally {
      setLoading(false);
    }
  }, [pairCode, hostId, guestId, selectedTheme]);

  useEffect(() => {
    initOrFetchSession();
  }, [initOrFetchSession]);

  useEffect(() => {
    setCandidateWords(getRandomWords(4, selectedTheme));
  }, [selectedTheme]);

  useEffect(() => {
    if (!pairCode) return;

    const channel = supabase.channel(`guess_channel_${pairCode}`);

    channel
      .on('broadcast', { event: 'GUESS_STATE_UPDATE' }, (payload) => {
        if (payload.payload?.session) setSession(payload.payload.session);
        if (payload.payload?.questions) setQuestions(payload.payload.questions);
        if (payload.payload?.records) setRecords(payload.payload.records);

        if (payload.payload?.sound === 'ding') soundEffects.playDing();
        if (payload.payload?.sound === 'victory') {
          soundEffects.playVictory();
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pairCode]);

  const broadcastUpdate = (
    updatedSession?: GuessSession | null,
    updatedQuestions?: GuessQuestion[],
    updatedRecords?: GuessRecord[],
    sound?: 'ding' | 'victory'
  ) => {
    if (!pairCode) return;
    supabase.channel(`guess_channel_${pairCode}`).send({
      type: 'broadcast',
      event: 'GUESS_STATE_UPDATE',
      payload: {
        session: updatedSession ?? session,
        questions: updatedQuestions ?? questions,
        records: updatedRecords ?? records,
        sound,
      },
    });
  };

  const handleCategoryChange = (theme: string) => {
    setSelectedTheme(theme);
    setCandidateWords(getRandomWords(4, theme));
  };

  const handleSelectWord = async (word: WordItem | { name: string; theme: string; note?: string }) => {
    if (!session) return;
    const updated: GuessSession = {
      ...session,
      status: 'playing',
      theme: word.theme,
      secret_word: word.name,
      secret_word_category: word.theme,
      secret_word_note: word.note || null,
    };

    setSession(updated);

    if (isSupabaseConfigured) {
      await supabase
        .from('guess_sessions')
        .update({
          status: 'playing',
          theme: word.theme,
          secret_word: word.name,
          secret_word_category: word.theme,
          secret_word_note: word.note || null,
        })
        .eq('id', session.id);
    }

    soundEffects.playPop();
    broadcastUpdate(updated, questions, records, 'ding');
  };

  const handleAskQuestion = async (text: string) => {
    const qText = text.trim();
    if (!qText || !session) return;
    setSubmitting(true);

    const newQ: GuessQuestion = {
      id: 'q_' + Date.now(),
      session_id: session.id,
      pair_code: pairCode || '',
      question_number: questions.length + 1,
      text: qText,
      answer: null,
      answered_at: null,
      created_at: new Date().toISOString(),
    };

    const nextQuestions = [...questions, newQ];
    const nextSession = { ...session, questions_count: nextQuestions.length };

    setQuestions(nextQuestions);
    setSession(nextSession);
    setQuestionInput('');
    setSubmitting(false);

    soundEffects.playPop();
    broadcastUpdate(nextSession, nextQuestions, records, 'ding');

    if (isSupabaseConfigured) {
      await supabase.from('guess_questions').insert({
        session_id: session.id,
        pair_code: pairCode,
        question_number: newQ.question_number,
        text: qText,
      });
      await supabase
        .from('guess_sessions')
        .update({ questions_count: nextQuestions.length })
        .eq('id', session.id);
    }
  };

  const handleAnswerQuestion = async (qId: string, ans: AnswerType) => {
    if (!session) return;
    const nextQuestions = questions.map((q) =>
      q.id === qId ? { ...q, answer: ans, answered_at: new Date().toISOString() } : q
    );

    setQuestions(nextQuestions);
    soundEffects.playDing();
    broadcastUpdate(session, nextQuestions, records, 'ding');

    if (isSupabaseConfigured) {
      await supabase
        .from('guess_questions')
        .update({
          answer: ans,
          answered_at: new Date().toISOString(),
        })
        .eq('id', qId);
    }
  };

  const handleMakeGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    const gText = guessInput.trim();
    if (!gText || !session || !session.secret_word) return;

    setSubmitting(true);
    const isCorrect = gText === session.secret_word;

    const newRecord: GuessRecord = {
      id: 'g_' + Date.now(),
      session_id: session.id,
      pair_code: pairCode || '',
      guess_text: gText,
      is_correct: isCorrect,
      created_at: new Date().toISOString(),
    };

    const nextRecords = [...records, newRecord];
    let nextSession = { ...session };

    if (isCorrect) {
      nextSession.status = 'settled';
      nextSession.result = 'guessed';
      nextSession.ended_at = new Date().toISOString();
      soundEffects.playVictory();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    } else {
      nextSession.wrong_guesses_count = (nextSession.wrong_guesses_count || 0) + 1;
      soundEffects.playPop();
    }

    setRecords(nextRecords);
    setSession(nextSession);
    setGuessInput('');
    setSubmitting(false);

    broadcastUpdate(nextSession, questions, nextRecords, isCorrect ? 'victory' : 'ding');

    if (isSupabaseConfigured) {
      await supabase.from('guess_records').insert({
        session_id: session.id,
        pair_code: pairCode,
        guess_text: gText,
        is_correct: isCorrect,
      });

      if (isCorrect) {
        await supabase
          .from('guess_sessions')
          .update({
            status: 'settled',
            result: 'guessed',
            ended_at: new Date().toISOString(),
          })
          .eq('id', session.id);
      } else {
        await supabase
          .from('guess_sessions')
          .update({ wrong_guesses_count: nextSession.wrong_guesses_count })
          .eq('id', session.id);
      }
    }
  };

  const handleRefreshWords = () => {
    setCandidateWords(getRandomWords(4, selectedTheme));
    soundEffects.playPop();
  };

  // 出题人：AI 灵感题库生成
  const handleGenerateAIWords = async () => {
    if (!isAIConfigured()) {
      setShowAISettings(true);
      return;
    }
    setAiWordsLoading(true);
    try {
      const generated = await generateWordCandidates({
        theme: selectedTheme,
        count: 4,
      });
      if (generated && generated.length > 0) {
        setCandidateWords(
          generated.map((w, idx) => ({
            id: 'ai_' + Date.now() + '_' + idx,
            name: w.name,
            theme: selectedTheme,
            difficulty: 'medium' as const,
            note: w.note,
          }))
        );
        soundEffects.playDing();
      }
    } catch (err: any) {
      alert(err.message || 'AI 题库生成失败');
    } finally {
      setAiWordsLoading(false);
    }
  };

  // 出题人：事实查证助手
  const handleFactCheck = async (question: GuessQuestion) => {
    if (!session?.secret_word) return;
    if (!isAIConfigured()) {
      setShowAISettings(true);
      return;
    }

    setFactChecks((prev) => ({
      ...prev,
      [question.id]: { loading: true },
    }));

    try {
      const res = await verifyQuestionFact({
        secretWord: session.secret_word,
        theme: session.theme || '通用',
        questionText: question.text,
      });
      setFactChecks((prev) => ({
        ...prev,
        [question.id]: { loading: false, result: res },
      }));
    } catch (err: any) {
      setFactChecks((prev) => ({
        ...prev,
        [question.id]: { loading: false, error: err.message || '查证失败' },
      }));
    }
  };

  // 猜词人：请求 AI 推荐下一问
  const handleRequestAIRecommend = async () => {
    if (!isAIConfigured()) {
      setShowAISettings(true);
      return;
    }
    setAILoading(true);
    try {
      const res = await generateQuestionRecommendations({
        theme: session?.theme || '通用',
        questions,
      });
      setAiRecommendations(res.questions);
    } catch (err: any) {
      alert(err.message || 'AI 推荐失败');
    } finally {
      setAILoading(false);
    }
  };

  // 猜词人：请求 AI 阶段提示
  const handleRequestAIHint = async () => {
    if (!isAIConfigured()) {
      setShowAISettings(true);
      return;
    }
    setAILoading(true);
    try {
      const res = await generateStageHint({
        theme: session?.theme || '通用',
        questions,
      });
      setStageHint(res);
    } catch (err: any) {
      alert(err.message || 'AI 提示生成失败');
    } finally {
      setAILoading(false);
    }
  };

  // 猜词人：请求偏航评估
  const handleEvaluateOffTrack = async () => {
    setAILoading(true);
    try {
      const res = await evaluateOffTrackWarning({
        theme: session?.theme || '通用',
        questions,
      });
      setOffTrackResult(res);
    } catch (err: any) {
      alert(err.message || '评估失败');
    } finally {
      setAILoading(false);
    }
  };

  // 出题人提供线索提示
  const handleProvideHint = async (hintText: string) => {
    const text = hintText.trim();
    if (!text || !session) return;
    const hintQ: GuessQuestion = {
      id: 'hint_' + Date.now(),
      session_id: session.id,
      pair_code: pairCode || '',
      question_number: questions.length + 1,
      text: `💡 线索提示：${text}`,
      answer: 'yes',
      answered_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    const nextQuestions = [...questions, hintQ];
    setQuestions(nextQuestions);
    soundEffects.playDing();
    broadcastUpdate(session, nextQuestions, records, 'ding');

    if (isSupabaseConfigured) {
      await supabase.from('guess_questions').insert({
        session_id: session.id,
        pair_code: pairCode,
        question_number: hintQ.question_number,
        text: hintQ.text,
        answer: 'yes',
        answered_at: hintQ.answered_at,
      });
    }
  };

  // 原版放弃本局（认输并揭晓秘密词语，带防误触确认）
  const handleSurrender = async () => {
    if (!session || !session.secret_word) return;
    if (!window.confirm('确定要放弃本局并揭晓秘密词语吗？')) return;

    const nextSession: GuessSession = {
      ...session,
      status: 'settled',
      result: 'surrendered',
      ended_at: new Date().toISOString(),
    };
    setSession(nextSession);
    soundEffects.playPop();
    broadcastUpdate(nextSession, questions, records, 'ding');

    if (isSupabaseConfigured) {
      await supabase
        .from('guess_sessions')
        .update({
          status: 'settled',
          result: 'surrendered',
          ended_at: new Date().toISOString(),
        })
        .eq('id', session.id);
    }
  };

  // 重置/重新开始第 1 轮
  const handleRestartGame = async () => {
    if (!pairCode) return;
    if (!window.confirm('确定要重新开始对局吗？')) return;

    const restartedSession: GuessSession = {
      id: 'guess_' + Date.now(),
      pair_code: pairCode,
      round_number: 1,
      status: 'word_selection',
      master_id: hostId,
      guesser_id: guestId,
      theme: selectedTheme,
      secret_word: null,
      secret_word_category: null,
      secret_word_note: null,
      questions_count: 0,
      wrong_guesses_count: 0,
      result: null,
      created_at: new Date().toISOString(),
      ended_at: null,
    };

    setSession(restartedSession);
    setQuestions([]);
    setRecords([]);
    setAiRecommendations(null);
    setStageHint(null);
    setOffTrackResult(null);
    setFactChecks({});
    setCandidateWords(getRandomWords(4, selectedTheme));
    soundEffects.playDing();
    broadcastUpdate(restartedSession, [], [], 'ding');

    if (isSupabaseConfigured) {
      await supabase.from('guess_sessions').insert({
        pair_code: pairCode,
        round_number: 1,
        status: 'word_selection',
        master_id: hostId,
        guesser_id: guestId,
        theme: selectedTheme,
      });
    }
  };

  // 抢占/切换为出题人
  const handleTakeOverMaster = async () => {
    if (!pairCode) return;
    const myMasterId = isHost ? hostId : guestId;
    const otherGuesserId = isHost ? guestId : hostId;
    const updatedSession: GuessSession = {
      ...(session || {
        id: 'guess_' + Date.now(),
        pair_code: pairCode,
        round_number: 1,
        status: 'word_selection',
        theme: selectedTheme,
        secret_word: null,
        secret_word_category: null,
        secret_word_note: null,
        questions_count: 0,
        wrong_guesses_count: 0,
        result: null,
        created_at: new Date().toISOString(),
        ended_at: null,
      }),
      status: 'word_selection',
      master_id: myMasterId,
      guesser_id: otherGuesserId,
    };

    setSession(updatedSession);
    setQuestions([]);
    setRecords([]);
    soundEffects.playDing();
    broadcastUpdate(updatedSession, [], [], 'ding');

    if (isSupabaseConfigured) {
      if (session) {
        await supabase
          .from('guess_sessions')
          .update({
            status: 'word_selection',
            master_id: myMasterId,
            guesser_id: otherGuesserId,
          })
          .eq('id', session.id);
      } else {
        await supabase.from('guess_sessions').insert({
          pair_code: pairCode,
          round_number: 1,
          status: 'word_selection',
          master_id: myMasterId,
          guesser_id: otherGuesserId,
          theme: selectedTheme,
        });
      }
    }
  };

  // 开始新的一轮
  const handleStartNewRound = async (swapRoles: boolean) => {
    if (!pairCode || !session) return;
    const nextMasterId = swapRoles ? session.guesser_id : session.master_id;
    const nextGuesserId = swapRoles ? session.master_id : session.guesser_id;

    const nextSession: GuessSession = {
      id: 'guess_' + Date.now(),
      pair_code: pairCode,
      round_number: (session.round_number || 1) + 1,
      status: 'word_selection',
      master_id: nextMasterId,
      guesser_id: nextGuesserId,
      theme: selectedTheme,
      secret_word: null,
      secret_word_category: null,
      secret_word_note: null,
      questions_count: 0,
      wrong_guesses_count: 0,
      result: null,
      created_at: new Date().toISOString(),
      ended_at: null,
    };

    setSession(nextSession);
    setQuestions([]);
    setRecords([]);
    setAiRecommendations(null);
    setStageHint(null);
    setOffTrackResult(null);
    setFactChecks({});
    setCandidateWords(getRandomWords(4, selectedTheme));
    soundEffects.playDing();
    broadcastUpdate(nextSession, [], [], 'ding');

    if (isSupabaseConfigured) {
      await supabase.from('guess_sessions').insert({
        pair_code: pairCode,
        round_number: nextSession.round_number,
        status: 'word_selection',
        master_id: nextMasterId,
        guesser_id: nextGuesserId,
        theme: selectedTheme,
      });
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#545E79] border-t-transparent animate-spin" />
        <p className="text-xs text-[#64708F] font-mono">加载对局中...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 px-2 sm:px-4 py-2">
      {/* 顶部状态与操作栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-[#BDC6E3] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-[#2C3345] font-mono uppercase tracking-wider">
              第 {session.round_number || 1} 轮
            </span>
          </div>

          <div className="h-4 w-px bg-[#BDC6E3]" />

          <div className="flex items-center gap-1.5 text-xs text-[#2C3345]">
            <span className="font-semibold">{myRoleName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI 密钥设置按钮 */}
          <button
            type="button"
            onClick={() => setShowAISettings(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#BDC6E3] hover:border-[#545E79] bg-[#EEF3FD] hover:bg-white text-[#545E79] text-xs font-semibold transition-all active:scale-95 shadow-2xs"
            title="配置 Gemini 或 DeepSeek API Key"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>AI: {aiModelName}</span>
          </button>

          {/* 阶段 2 放弃本局按钮 */}
          {session.status === 'playing' && (
            <button
              type="button"
              onClick={handleSurrender}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 hover:border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-all active:scale-95 shadow-2xs"
              title="放弃本局并揭晓秘密词语"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>放弃本局</span>
            </button>
          )}

          {/* 重置本局按钮 */}
          <button
            type="button"
            onClick={handleRestartGame}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#BDC6E3] hover:border-[#545E79] bg-white text-[#545E79] hover:text-[#2C3345] text-xs font-semibold transition-all active:scale-95 shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重新开始</span>
          </button>
        </div>
      </div>

      {/* 阶段 1：出题选题阶段 */}
      {session.status === 'word_selection' && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#BDC6E3] shadow-xs">
          {isMaster ? (
            <div className="space-y-6">
              <div className="text-center max-w-md mx-auto">
                <span className="w-10 h-10 rounded-xl bg-[#EEF3FD] text-[#545E79] inline-flex items-center justify-center mb-2 border border-[#BDC6E3]">
                  <Lightbulb className="w-5 h-5" />
                </span>
                <h2 className="text-base font-bold text-[#2C3345]">选择秘密词语</h2>
              </div>

              {/* 主题标签快速切换 */}
              <div className="flex flex-wrap gap-1.5 justify-center">
                {THEMES.map((theme) => (
                  <button
                    key={theme}
                    onClick={() => handleCategoryChange(theme)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      selectedTheme === theme
                        ? 'bg-[#545E79] text-white shadow-xs'
                        : 'bg-[#EEF3FD] text-[#545E79] hover:bg-[#D8E2FD] border border-[#BDC6E3]/60'
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>

              {/* 候选词卡片网格 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {candidateWords.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectWord(item)}
                    className="p-3.5 rounded-xl border border-[#BDC6E3] bg-[#F7FAFE] hover:bg-[#EEF3FD] hover:border-[#545E79] text-left transition-all group shadow-xs"
                  >
                    <span className="text-xs font-bold text-[#2C3345] group-hover:text-[#545E79] block">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-[#64708F] mt-1 block line-clamp-2 leading-relaxed">
                      {item.note || item.theme}
                    </span>
                  </button>
                ))}
              </div>

              {/* 换词与 AI 灵感题库操作栏 */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRefreshWords}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#BDC6E3] hover:border-[#545E79] bg-[#EEF3FD] hover:bg-white text-xs text-[#545E79] font-medium transition-all shadow-2xs active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>换一批题目</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateAIWords}
                  disabled={aiWordsLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#545E79] hover:bg-[#3D465C] disabled:bg-[#CAD4EE] text-white text-xs font-medium transition-all shadow-2xs active:scale-95"
                  title="使用 AI 实时生成 4 个富有创意的新词条"
                >
                  {aiWordsLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-[#D8E2FD]" />
                  )}
                  <span>AI 灵感题库</span>
                </button>
              </div>

              {/* 自定义词语输入 */}
              <div className="pt-4 border-t border-[#CAD4EE]/40 flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  placeholder="或者输入自定义词语..."
                  value={customWord}
                  onChange={(e) => setCustomWord(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-[#BDC6E3] text-xs focus:outline-none focus:ring-2 focus:ring-[#545E79] bg-[#F7FAFE] text-[#2C3345]"
                />
                <button
                  onClick={() => {
                    if (customWord.trim()) {
                      handleSelectWord({
                        name: customWord.trim(),
                        theme: '自定义主题',
                        note: '自定义词语',
                      });
                    }
                  }}
                  disabled={!customWord.trim()}
                  className="px-5 py-2 rounded-xl bg-[#545E79] disabled:bg-[#CAD4EE] text-white text-xs font-semibold hover:bg-[#3D465C] transition-colors active:scale-95"
                >
                  确定自定义
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 sm:py-16 text-center space-y-4 max-w-sm mx-auto">
              <div className="w-12 h-12 mx-auto rounded-xl bg-[#EEF3FD] text-[#545E79] flex items-center justify-center shadow-xs border border-[#BDC6E3]">
                <Sparkles className="w-6 h-6 text-[#545E79]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#2C3345]">
                  {partnerNickname} 正在选词...
                </h3>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
                <button
                  type="button"
                  onClick={handleTakeOverMaster}
                  className="px-4 py-2 rounded-xl bg-[#545E79] hover:bg-[#3D465C] text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>换我出题</span>
                </button>
                <button
                  type="button"
                  onClick={handleRestartGame}
                  className="px-4 py-2 rounded-xl border border-[#BDC6E3] hover:border-[#545E79] bg-[#EEF3FD] hover:bg-white text-[#545E79] font-semibold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>重置对局</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 阶段 2：问答与猜词阶段 */}
      {session.status === 'playing' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 左侧：提问时间轴 (占2列) */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-[#BDC6E3] shadow-xs min-h-[380px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-[#CAD4EE]/40 mb-3">
                  <h3 className="text-xs font-bold text-[#2C3345] flex items-center gap-1.5 font-mono uppercase">
                    <MessageCircle className="w-4 h-4 text-[#545E79]" />
                    提问记录 ({questions.length})
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-[#64708F] font-mono">
                    {session.theme && (
                      <span className="bg-[#EEF3FD] px-2 py-0.5 rounded text-[#545E79] font-medium border border-[#BDC6E3]/60">
                        分类: {session.theme}
                      </span>
                    )}
                    <span>错误猜测: {session.wrong_guesses_count || 0}</span>
                  </div>
                </div>

                {/* 问答列表 */}
                {questions.length === 0 ? (
                  <div className="py-16 text-center text-[#64708F] text-xs">
                    暂无提问，在下方提交问题开始二分推理
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
                    {questions.map((q) => {
                      const fc = factChecks[q.id];
                      return (
                        <div
                          key={q.id}
                          className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                            q.text.startsWith('💡 线索提示')
                              ? 'bg-amber-50/70 border-amber-200'
                              : 'bg-[#F7FAFE] border-[#BDC6E3]/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`font-medium leading-relaxed ${
                                q.text.startsWith('💡 线索提示')
                                  ? 'text-amber-900 font-bold'
                                  : 'text-[#2C3345]'
                              }`}
                            >
                              #{q.question_number} {q.text}
                            </span>

                            {/* 回答标识 */}
                            {q.answer === 'yes' && (
                              <span className="px-2 py-0.5 rounded-md bg-[#545E79] text-white font-bold text-[11px] flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-[#D8E2FD]" /> 是
                              </span>
                            )}
                            {q.answer === 'no' && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[11px] flex items-center gap-1 shrink-0 border border-rose-200">
                                <XCircle className="w-3 h-3" /> 不是
                              </span>
                            )}
                            {q.answer === 'uncertain' && (
                              <span className="px-2 py-0.5 rounded-md bg-[#EEF3FD] text-[#545E79] font-bold text-[11px] flex items-center gap-1 shrink-0 border border-[#BDC6E3]">
                                <QuestionIcon className="w-3 h-3" /> 不确定
                              </span>
                            )}
                            {!q.answer && (
                              <span className="px-2 py-0.5 rounded-md bg-[#EEF3FD] text-[#64708F] text-[10px] font-mono shrink-0 border border-[#BDC6E3]/60">
                                WAITING
                              </span>
                            )}
                          </div>

                          {/* 出题人事实查证展示 */}
                          {fc?.result && (
                            <div className="p-2 rounded-lg bg-indigo-50/70 border border-indigo-200 text-[11px] text-indigo-950 flex items-start gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">
                                  AI 查证建议：
                                  {fc.result.suggestedAnswer === 'yes'
                                    ? '是'
                                    : fc.result.suggestedAnswer === 'no'
                                    ? '否'
                                    : '不确定'}
                                </span>
                                <span className="ml-1 text-indigo-800">
                                  ({fc.result.explanation})
                                </span>
                              </div>
                            </div>
                          )}

                          {fc?.error && (
                            <div className="text-[11px] text-rose-500">
                              查证异常: {fc.error}
                            </div>
                          )}

                          {/* 出题人回答与 AI 查证按钮栏 */}
                          {isMaster && !q.answer && (
                            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#CAD4EE]/40">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleAnswerQuestion(q.id, 'yes')}
                                  className="px-3 py-1 rounded-lg bg-[#545E79] hover:bg-[#3D465C] text-white font-semibold text-xs flex items-center gap-1 shadow-2xs active:scale-95"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-[#D8E2FD]" /> 是
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAnswerQuestion(q.id, 'no')}
                                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1 shadow-2xs active:scale-95"
                                >
                                  <XCircle className="w-3 h-3" /> 否
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAnswerQuestion(q.id, 'uncertain')}
                                  className="px-3 py-1 rounded-lg bg-[#BDC6E3] hover:bg-[#CAD4EE] text-[#2C3345] font-semibold text-xs flex items-center gap-1 shadow-2xs active:scale-95"
                                >
                                  <QuestionIcon className="w-3 h-3" /> 不确定
                                </button>
                              </div>

                              {/* AI 百科查证小按钮 */}
                              <button
                                type="button"
                                onClick={() => handleFactCheck(q)}
                                disabled={fc?.loading}
                                className="px-2.5 py-1 rounded-lg border border-[#BDC6E3] hover:border-[#545E79] bg-white text-[#545E79] text-[11px] font-medium flex items-center gap-1 transition-all active:scale-95"
                                title="核查秘密词语关于该问题的事实依据"
                              >
                                {fc?.loading ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-[#545E79]" />
                                ) : (
                                  <Sparkles className="w-3 h-3 text-[#545E79]" />
                                )}
                                <span>AI 查证</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 出题人线索快捷提示 */}
                {isMaster && (
                  <div className="pt-3 mt-3 border-t border-[#CAD4EE]/40 space-y-1.5">
                    <span className="text-[11px] font-bold text-[#545E79] flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 text-[#545E79]" />
                      快捷提示
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleProvideHint(
                            `字数提示：这个词一共有 ${session.secret_word?.length || 2} 个字`
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-[#EEF3FD] hover:bg-[#D8E2FD] border border-[#BDC6E3] text-[#545E79] text-[11px] font-medium transition-colors"
                      >
                        字数 ({session.secret_word?.length || 2}字)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleProvideHint(`首字提示：第一个字是“${session.secret_word?.[0] || ''}”`)
                        }
                        className="px-2.5 py-1 rounded-lg bg-[#EEF3FD] hover:bg-[#D8E2FD] border border-[#BDC6E3] text-[#545E79] text-[11px] font-medium transition-colors"
                      >
                        首字 ({session.secret_word?.[0] || ''})
                      </button>
                      {session.secret_word_category && (
                        <button
                          type="button"
                          onClick={() =>
                            handleProvideHint(`分类：属于【${session.secret_word_category}】`)
                          }
                          className="px-2.5 py-1 rounded-lg bg-[#EEF3FD] hover:bg-[#D8E2FD] border border-[#BDC6E3] text-[#545E79] text-[11px] font-medium transition-colors"
                        >
                          分类提示
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 猜词人提问输入与 AI 思路助手 */}
              {!isMaster && (
                <div className="pt-3 mt-3 border-t border-[#CAD4EE]/40 space-y-2.5">
                  {/* AI 思路助手面板 */}
                  <div className="bg-[#F5F8FE] rounded-xl border border-[#BDC6E3] p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#2C3345]">
                        <Sparkles className="w-3.5 h-3.5 text-[#545E79]" />
                        <span>AI 思路助手</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleRequestAIRecommend}
                          disabled={aiLoading}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#BDC6E3] hover:border-[#545E79] text-[11px] font-medium text-[#545E79] flex items-center gap-1 shadow-2xs active:scale-95"
                        >
                          <Lightbulb className="w-3 h-3 text-[#545E79]" />
                          <span>推荐下一问</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRequestAIHint}
                          disabled={aiLoading}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#BDC6E3] hover:border-[#545E79] text-[11px] font-medium text-[#545E79] flex items-center gap-1 shadow-2xs active:scale-95"
                        >
                          <Compass className="w-3 h-3 text-[#545E79]" />
                          <span>阶段提示</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleEvaluateOffTrack}
                          disabled={aiLoading}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#BDC6E3] hover:border-[#545E79] text-[11px] font-medium text-[#545E79] flex items-center gap-1 shadow-2xs active:scale-95"
                        >
                          <AlertTriangle className="w-3 h-3 text-[#545E79]" />
                          <span>偏航评估</span>
                        </button>
                      </div>
                    </div>

                    {/* AI 推荐问题展示 (一键填入输入框) */}
                    {aiRecommendations && aiRecommendations.length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-[#CAD4EE]/40 animate-fade-in">
                        <span className="text-[10px] text-[#64708F] block font-mono">
                          点击推荐问题可直接填入提问框：
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                          {aiRecommendations.map((rec, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setQuestionInput(rec.question)}
                              className="p-2 rounded-lg bg-white border border-[#BDC6E3] hover:border-[#545E79] text-left transition-all group shadow-2xs"
                            >
                              <span className="text-[11px] font-semibold text-[#2C3345] group-hover:text-[#545E79] block">
                                {rec.question}
                              </span>
                              <span className="text-[10px] text-[#64708F] mt-0.5 block line-clamp-1">
                                {rec.rationale}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI 阶段提示展示 */}
                    {stageHint && (
                      <div className="p-2.5 rounded-lg bg-white border border-[#BDC6E3] text-xs text-[#2C3345] space-y-1 animate-fade-in">
                        <div className="font-bold text-[#545E79] flex items-center gap-1 text-[11px]">
                          <Compass className="w-3.5 h-3.5" />
                          <span>方向：{stageHint.direction}</span>
                        </div>
                        <p className="text-[11px] text-[#64708F] leading-relaxed">
                          {stageHint.hint}
                        </p>
                      </div>
                    )}

                    {/* AI 偏航评估展示 */}
                    {offTrackResult && (
                      <div
                        className={`p-2.5 rounded-lg border text-xs leading-relaxed animate-fade-in ${
                          offTrackResult.status === 'effective'
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                            : offTrackResult.status === 'possible_off_track'
                            ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                            : 'bg-white border-[#BDC6E3] text-[#64708F]'
                        }`}
                      >
                        <span className="font-bold block mb-0.5 text-[11px]">
                          {offTrackResult.status === 'effective'
                            ? '✔ 推进正常'
                            : offTrackResult.status === 'possible_off_track'
                            ? '⚠ 可能偏航'
                            : 'ℹ 信息补充中'}
                        </span>
                        <p className="text-[11px]">{offTrackResult.rationale}</p>
                      </div>
                    )}
                  </div>

                  {/* 提问输入表单 */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAskQuestion(questionInput);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      disabled={submitting}
                      placeholder="向 TA 提问（是非问答）..."
                      value={questionInput}
                      onChange={(e) => setQuestionInput(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-[#BDC6E3] text-xs focus:outline-none focus:ring-2 focus:ring-[#545E79] bg-[#F7FAFE] text-[#2C3345] disabled:bg-slate-100"
                    />
                    <button
                      type="submit"
                      disabled={!questionInput.trim() || submitting}
                      className="px-4 py-2 rounded-xl bg-[#545E79] hover:bg-[#3D465C] disabled:bg-[#CAD4EE] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1 active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" /> 提问
                    </button>
                  </form>

                  {/* 预设快捷问题 */}
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_QUESTIONS.slice(0, 3).map((qq, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAskQuestion(qq)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-[#EEF3FD] text-[#545E79] hover:bg-[#D8E2FD] border border-[#BDC6E3] transition-colors"
                      >
                        + {qq}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 右侧：正式竞猜面板与历史猜测 (占1列) */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-[#BDC6E3] shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-[#2C3345] flex items-center gap-1.5 font-mono uppercase">
                <Trophy className="w-4 h-4 text-[#545E79]" />
                正式竞猜
              </h3>

              {!isMaster ? (
                <form onSubmit={handleMakeGuess} className="space-y-3">
                  <input
                    type="text"
                    placeholder="输入猜想词语..."
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#BDC6E3] focus:outline-none focus:ring-2 focus:ring-[#545E79] text-xs font-bold text-center bg-[#F7FAFE] text-[#2C3345]"
                  />
                  <button
                    type="submit"
                    disabled={!guessInput.trim() || submitting}
                    className="w-full py-2.5 rounded-xl bg-[#545E79] hover:bg-[#3D465C] disabled:bg-[#CAD4EE] text-white font-bold text-xs shadow-xs transition-all active:scale-95"
                  >
                    提交正式猜词
                  </button>

                  {/* 猜词人放弃本局 */}
                  <button
                    type="button"
                    onClick={handleSurrender}
                    className="w-full py-2 rounded-xl border border-rose-200 hover:border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95"
                    title="放弃本局并揭晓秘密词语"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>放弃本局</span>
                  </button>
                </form>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#F7FAFE] border border-[#BDC6E3]/60 text-xs text-[#545E79] leading-relaxed">
                  <div className="font-semibold text-[#2C3345] mb-1">秘密词语：{session.secret_word}</div>
                  <div className="text-[11px] text-[#64708F]">等待 {partnerNickname} 竞猜中</div>
                </div>
              )}

              {/* 历史猜测列表 */}
              <div className="pt-3 border-t border-[#CAD4EE]/40">
                <span className="text-[11px] font-mono text-[#64708F] block mb-2 uppercase">
                  猜测历史 ({records.length})
                </span>
                {records.length === 0 ? (
                  <p className="text-xs text-slate-300 font-mono">暂无猜测</p>
                ) : (
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto no-scrollbar">
                    {records.map((r) => (
                      <div
                        key={r.id}
                        className={`px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                          r.is_correct
                            ? 'bg-[#EEF3FD] text-[#545E79] font-bold border border-[#BDC6E3]'
                            : 'bg-[#F7FAFE] text-[#64708F] border border-[#BDC6E3]/60'
                        }`}
                      >
                        <span>{r.guess_text}</span>
                        <span className="font-mono text-[11px]">
                          {r.is_correct ? '正确 🎯' : '错误 ❌'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 阶段 3：回合结算页 */}
      {session.status === 'settled' && (
        <div className="bg-white rounded-2xl p-8 border border-[#BDC6E3] shadow-lg text-center space-y-5 max-w-md mx-auto animate-fade-in my-auto">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#545E79] text-white flex items-center justify-center shadow-md border border-[#64708F]">
            <Trophy className="w-7 h-7 text-[#D8E2FD]" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-[#2C3345]">
              {session.result === 'guessed'
                ? '🎉 猜出秘密词语！'
                : '🏳️ 已放弃本局，答案揭晓'}
            </h2>
            <p className="text-xs text-[#64708F] mt-1 font-mono">
              秘密词语: <strong className="text-sm text-[#2C3345] font-bold">{session.secret_word}</strong>
              {session.secret_word_category && (
                <span className="text-[#64708F] ml-1">({session.secret_word_category})</span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 py-2 bg-[#F7FAFE] rounded-xl border border-[#BDC6E3] text-xs">
            <div>
              <span className="text-[#64708F] block text-[11px] font-mono">提问次数</span>
              <strong className="text-xs font-bold text-[#2C3345] font-mono">
                {questions.length} 次
              </strong>
            </div>
            <div>
              <span className="text-[#64708F] block text-[11px] font-mono">错误猜测</span>
              <strong className="text-xs font-bold text-[#2C3345] font-mono">
                {session.wrong_guesses_count || 0}
              </strong>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={() => handleStartNewRound(true)}
              className="flex-1 py-2.5 rounded-xl bg-[#545E79] hover:bg-[#3D465C] text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 touch-manipulation cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              互换角色再来一局
            </button>
            <button
              onClick={() => handleStartNewRound(false)}
              className="flex-1 py-2.5 rounded-xl border border-[#BDC6E3] text-[#545E79] font-semibold text-xs hover:bg-[#EEF3FD] transition-colors active:scale-95 touch-manipulation cursor-pointer"
            >
              保持角色继续
            </button>
          </div>
        </div>
      )}

      {/* AI 密钥设置弹窗 */}
      <AISettingsModal
        isOpen={showAISettings}
        onClose={() => setShowAISettings(false)}
        onConfigSaved={refreshAIStatus}
      />
    </div>
  );
}
