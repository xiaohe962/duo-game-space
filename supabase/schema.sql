-- ========================================================
-- 双人专属小游戏合集与互动空间 - Supabase 数据库初始化脚本 (v2.0)
-- 升级特性：支持多设备同账号凭据登录、平板高清画板与全端适配
-- ========================================================

-- 1. 创建双人专属房间表 (支持跨设备账号认领)
CREATE TABLE IF NOT EXISTS public.couple_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(4) UNIQUE NOT NULL, -- 4 位数字房间码 (如 8821)
    status VARCHAR(20) NOT NULL DEFAULT 'waiting', -- waiting, paired, closed
    host_user_id VARCHAR(64) NOT NULL, -- 固定账号: pair_{code}_host
    host_nickname VARCHAR(64) NOT NULL DEFAULT 'Player 1',
    host_pin VARCHAR(32) DEFAULT '0000', -- 角色 A 跨设备登录凭证
    guest_user_id VARCHAR(64),          -- 固定账号: pair_{code}_guest
    guest_nickname VARCHAR(64) DEFAULT 'Player 2',
    guest_pin VARCHAR(32) DEFAULT '0000', -- 角色 B 跨设备登录凭证
    host_last_active TIMESTAMPTZ DEFAULT now(),
    guest_last_active TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 模块 3：动态空间（动态说说与留言墙表）
CREATE TABLE IF NOT EXISTS public.couple_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_code VARCHAR(4) NOT NULL REFERENCES public.couple_rooms(code) ON DELETE CASCADE,
    author_id VARCHAR(64) NOT NULL, -- 严格绑定至固定跨端账号
    author_nickname VARCHAR(64) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    mood VARCHAR(32) DEFAULT '📌',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 模块 1：GuessWhat（猜词小游戏会话表）
CREATE TABLE IF NOT EXISTS public.guess_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_code VARCHAR(4) NOT NULL REFERENCES public.couple_rooms(code) ON DELETE CASCADE,
    round_number INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'word_selection',
    master_id VARCHAR(64) NOT NULL,
    guesser_id VARCHAR(64) NOT NULL,
    theme VARCHAR(64),
    secret_word TEXT,
    secret_word_category TEXT,
    secret_word_note TEXT,
    questions_count INT DEFAULT 0,
    wrong_guesses_count INT DEFAULT 0,
    result VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ
);

-- GuessWhat：提问列表
CREATE TABLE IF NOT EXISTS public.guess_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.guess_sessions(id) ON DELETE CASCADE,
    pair_code VARCHAR(4) NOT NULL,
    question_number INT NOT NULL,
    text TEXT NOT NULL,
    answer VARCHAR(20),
    answered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- GuessWhat：正式猜词记录
CREATE TABLE IF NOT EXISTS public.guess_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.guess_sessions(id) ON DELETE CASCADE,
    pair_code VARCHAR(4) NOT NULL,
    guess_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 模块 2：你画我猜（双人远程联机画板会话表）
CREATE TABLE IF NOT EXISTS public.draw_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_code VARCHAR(4) NOT NULL REFERENCES public.couple_rooms(code) ON DELETE CASCADE,
    round_number INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'word_selection',
    painter_id VARCHAR(64) NOT NULL,
    guesser_id VARCHAR(64) NOT NULL,
    word TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    hint TEXT DEFAULT '',
    remaining_seconds INT DEFAULT 120,
    winner_id VARCHAR(64),
    scores JSONB DEFAULT '{"host": 0, "guest": 0}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ
);

-- 你画我猜：聊天与竞猜记录表
CREATE TABLE IF NOT EXISTS public.draw_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_code VARCHAR(4) NOT NULL REFERENCES public.couple_rooms(code) ON DELETE CASCADE,
    session_id UUID REFERENCES public.draw_sessions(id) ON DELETE CASCADE,
    sender_id VARCHAR(64) NOT NULL,
    sender_nickname VARCHAR(64) NOT NULL,
    message TEXT NOT NULL,
    is_system BOOLEAN DEFAULT false,
    is_correct BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 核心查询索引
CREATE INDEX IF NOT EXISTS idx_couple_rooms_code ON public.couple_rooms(code);
CREATE INDEX IF NOT EXISTS idx_couple_posts_pair ON public.couple_posts(pair_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guess_sessions_pair ON public.guess_sessions(pair_code);
CREATE INDEX IF NOT EXISTS idx_guess_questions_session ON public.guess_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_guess_records_session ON public.guess_records(session_id);
CREATE INDEX IF NOT EXISTS idx_draw_sessions_pair ON public.draw_sessions(pair_code);
CREATE INDEX IF NOT EXISTS idx_draw_messages_session ON public.draw_messages(session_id, created_at ASC);

-- 6. 开启 Supabase Realtime 复制
ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guess_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guess_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guess_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.draw_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.draw_messages;

-- 7. 启用行级安全策略 (RLS)
ALTER TABLE public.couple_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guess_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guess_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guess_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for couple_rooms" ON public.couple_rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for couple_posts" ON public.couple_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for guess_sessions" ON public.guess_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for guess_questions" ON public.guess_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for guess_records" ON public.guess_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for draw_sessions" ON public.draw_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write for draw_messages" ON public.draw_messages FOR ALL USING (true) WITH CHECK (true);
