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
  CheckCircle2,
  XCircle,
  HelpCircle as QuestionIcon,
  Trophy,
  ArrowRight,
  User,
  Lightbulb,
  MessageCircle,
} from 'lucide-react';

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

  // 快捷问题推荐
  const QUICK_QUESTIONS = [
    '这是活的生物吗？',
    '这是日常生活中常见的人造物品吗？',
    '体积比一个篮球大吗？',
    '在家里或者办公室常见吗？',
    '和吃的东西或美食有关吗？',
    '它的价格通常很昂贵吗？',
  ];

  // 角色判定
  const isMaster = session ? session.master_id === userId : isHost;
  const myRoleName = isMaster ? '出题人 (回答 是/否)' : '猜词人 (提问与竞猜)';

  useEffect(() => {
    if (!isLoading && !pairCode) {
      router.replace('/');
    }
  }, [isLoading, pairCode, router]);

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
        master_id: userId,
        guesser_id: 'guest_user',
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
        setSession(activeSession as GuessSession);
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
        const partnerId = isHost ? (room?.guest_user_id || 'guest_user') : (room?.host_user_id || 'host_user');
        const { data: newSession } = await supabase
          .from('guess_sessions')
          .insert({
            pair_code: pairCode,
            round_number: 1,
            status: 'word_selection',
            master_id: userId,
            guesser_id: partnerId,
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
  }, [pairCode, userId, isHost, room, selectedTheme]);

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

  const handleStartNewRound = async (swapRoles: boolean) => {
    if (!session || !pairCode) return;
    const nextMasterId = swapRoles ? session.guesser_id : session.master_id;
    const nextGuesserId = swapRoles ? session.master_id : session.guesser_id;

    const newRoundNumber = session.round_number + 1;
    const newSession: GuessSession = {
      id: 'session_' + Date.now(),
      pair_code: pairCode,
      round_number: newRoundNumber,
      status: 'word_selection',
      master_id: nextMasterId,
      guesser_id: nextGuesserId,
      theme: '日常物品',
      secret_word: null,
      secret_word_category: null,
      secret_word_note: null,
      questions_count: 0,
      wrong_guesses_count: 0,
      result: null,
      created_at: new Date().toISOString(),
      ended_at: null,
    };

    setSession(newSession);
    setQuestions([]);
    setRecords([]);

    broadcastUpdate(newSession, [], [], 'ding');

    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('guess_sessions')
        .insert({
          pair_code: pairCode,
          round_number: newRoundNumber,
          status: 'word_selection',
          master_id: nextMasterId,
          guesser_id: nextGuesserId,
          theme: '日常物品',
        })
        .select()
        .single();
      if (data) setSession(data as GuessSession);
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
        <p className="text-xs text-slate-500 font-mono">LOADING GUESSWHAT...</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh max-w-4xl mx-auto px-4 py-4 md:py-6 space-y-4">
      {/* 顶部对局信息横幅 */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold font-mono text-sm">
            #{session.round_number}
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2">
              GuessWhat · 第 {session.round_number} 回合
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>当前身份：<strong className="text-blue-600 font-semibold">{myRoleName}</strong></span>
              <span>·</span>
              <span>主题：<span className="font-semibold text-slate-700">{session.theme || '自由选词'}</span></span>
            </p>
          </div>
        </div>

        {/* 秘密词语 */}
        <div className="flex items-center gap-2">
          {isMaster || session.status === 'settled' ? (
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-right">
              <span className="text-[10px] text-slate-400 font-mono block">SECRET WORD</span>
              <span className="text-xs font-bold text-slate-900 font-mono tracking-wider">
                {session.secret_word || '选题中...'}
              </span>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-right">
              <span className="text-[10px] text-slate-400 font-mono block">TARGET</span>
              <span className="text-xs font-bold text-slate-400 font-mono tracking-widest">
                ? ? ?
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 阶段 1：出题选题阶段 */}
      {session.status === 'word_selection' && (
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
          {isMaster ? (
            <div className="space-y-6">
              <div className="text-center max-w-md mx-auto">
                <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 inline-flex items-center justify-center mb-2">
                  <Lightbulb className="w-5 h-5" />
                </span>
                <h2 className="text-base font-bold text-slate-900">请为本轮挑选一个秘密词语</h2>
                <p className="text-xs text-slate-500 mt-1">
                  挑好后，{partnerNickname} 将通过向你提问逐步推断目标！
                </p>
              </div>

              {/* 主题标签快速切换 */}
              <div className="flex flex-wrap gap-1.5 justify-center">
                {THEMES.map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setSelectedTheme(theme)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      selectedTheme === theme
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-500 text-left transition-all group shadow-sm"
                  >
                    <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 block">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1 block line-clamp-2 leading-relaxed">
                      {item.note || item.theme}
                    </span>
                  </button>
                ))}
              </div>

              {/* 自定义词语输入 */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  placeholder="或者输入自定义词语..."
                  value={customWord}
                  onChange={(e) => setCustomWord(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
                />
                <button
                  onClick={() => {
                    if (customWord.trim()) {
                      handleSelectWord({
                        name: customWord.trim(),
                        theme: '自定义主题',
                        note: '出题人自定义词语',
                      });
                    }
                  }}
                  disabled={!customWord.trim()}
                  className="px-5 py-2 rounded-xl bg-slate-900 disabled:bg-slate-300 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                  确定使用自定义词
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                {partnerNickname} 正在挑选题目...
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                题目确定后你就可以开始问问题了。
              </p>
            </div>
          )}
        </div>
      )}

      {/* 阶段 2：问答与猜词阶段 */}
      {session.status === 'playing' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 左侧：提问时间轴 (占2列) */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm min-h-[380px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase font-mono">
                    <MessageCircle className="w-4 h-4 text-blue-600" />
                    Question Log ({questions.length} / 20)
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    WRONG GUESSES: {session.wrong_guesses_count || 0}
                  </span>
                </div>

                {/* 问答列表 */}
                {questions.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    暂无提问。猜词者可以在下方提交第一个问题！
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
                    {questions.map((q) => (
                      <div
                        key={q.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-slate-900">
                            #{q.question_number} {q.text}
                          </span>
                          {/* 回答标识 */}
                          {q.answer === 'yes' && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-3 h-3" /> 是的
                            </span>
                          )}
                          {q.answer === 'no' && (
                            <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-bold text-[11px] flex items-center gap-1 shrink-0">
                              <XCircle className="w-3 h-3" /> 不是
                            </span>
                          )}
                          {q.answer === 'uncertain' && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[11px] flex items-center gap-1 shrink-0">
                              <QuestionIcon className="w-3 h-3" /> 不确定
                            </span>
                          )}
                          {!q.answer && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 text-[10px] font-mono shrink-0">
                              WAITING
                            </span>
                          )}
                        </div>

                        {/* 出题人针对未回答问题的操作按钮 */}
                        {isMaster && !q.answer && (
                          <div className="pt-2 flex items-center gap-2 border-t border-slate-200">
                            <button
                              onClick={() => handleAnswerQuestion(q.id, 'yes')}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 shadow-sm"
                            >
                              <CheckCircle2 className="w-3 h-3" /> 是
                            </button>
                            <button
                              onClick={() => handleAnswerQuestion(q.id, 'no')}
                              className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center gap-1 shadow-sm"
                            >
                              <XCircle className="w-3 h-3" /> 否
                            </button>
                            <button
                              onClick={() => handleAnswerQuestion(q.id, 'uncertain')}
                              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1 shadow-sm"
                            >
                              <QuestionIcon className="w-3 h-3" /> 不确定
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 猜词人提问输入区 */}
              {!isMaster && (
                <div className="pt-4 mt-2 border-t border-slate-100 pb-safe">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAskQuestion(questionInput);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      placeholder="向 TA 提问（例如：它能在水里生活吗？）..."
                      value={questionInput}
                      onChange={(e) => setQuestionInput(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50"
                    />
                    <button
                      type="submit"
                      disabled={!questionInput.trim() || submitting}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" /> 提问
                    </button>
                  </form>

                  {/* 快捷问题锦囊 */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_QUESTIONS.slice(0, 3).map((qq, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAskQuestion(qq)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors"
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
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 font-mono uppercase">
                <Trophy className="w-4 h-4 text-blue-600" />
                Make a Guess
              </h3>

              {!isMaster ? (
                <form onSubmit={handleMakeGuess} className="space-y-3">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    输入你的最终答案进行正式判题：
                  </p>
                  <input
                    type="text"
                    placeholder="输入猜想词语..."
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-bold text-center bg-slate-50"
                  />
                  <button
                    type="submit"
                    disabled={!guessInput.trim() || submitting}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    提交正式猜词
                  </button>
                </form>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed font-mono">
                  出题人模式：静待 {partnerNickname} 竞猜。答对自动判定揭晓。
                </div>
              )}

              {/* 历史猜测列表 */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-mono text-slate-400 block mb-2 uppercase">
                  History ({records.length})
                </span>
                {records.length === 0 ? (
                  <p className="text-xs text-slate-300 font-mono">NO RECORDS</p>
                ) : (
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto no-scrollbar">
                    {records.map((r) => (
                      <div
                        key={r.id}
                        className={`px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                          r.is_correct
                            ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                            : 'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <span>{r.guess_text}</span>
                        <span className="font-mono text-[11px]">{r.is_correct ? 'CORRECT 🎯' : 'WRONG ❌'}</span>
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
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-lg text-center space-y-5 max-w-md mx-auto">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <Trophy className="w-7 h-7 text-amber-400" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {session.result === 'guessed' ? '🎉 竞猜成功！' : '本局已结束'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-mono">
              SECRET WORD: <strong className="text-sm text-slate-900 font-bold">{session.secret_word}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] font-mono">QUESTIONS</span>
              <strong className="text-xs font-bold text-slate-800 font-mono">{questions.length}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-mono">WRONG GUESSES</span>
              <strong className="text-xs font-bold text-slate-800 font-mono">{session.wrong_guesses_count || 0}</strong>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={() => handleStartNewRound(true)}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              互换角色再来一局
            </button>
            <button
              onClick={() => handleStartNewRound(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
            >
              保持角色继续
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
