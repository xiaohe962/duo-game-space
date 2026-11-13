-- ========================================================
-- 动态空间深度重构扩展迁移脚本 (Migration v3.0 - Idempotent Safe Version)
-- 包含：小红花与徽章系统、动态贴纸表态、实时状态打卡、存储桶及 RLS 策略
-- 提示：可在 Supabase SQL Editor 中直接全量执行，支持重复执行无冲突
-- ========================================================

-- 1. 动态表扩展字段 (Posts Table Alteration)
ALTER TABLE IF EXISTS public.couple_posts 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.couple_posts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS post_type VARCHAR(32) DEFAULT 'normal';

-- 2. 小红花与徽章系统 (Badges & Rewards)
-- 徽章余额表 (复合主键 pair_code + user_id + badge_type，完美支持原子 upsert)
CREATE TABLE IF NOT EXISTS public.badge_balances (
    pair_code VARCHAR(4) NOT NULL REFERENCES public.couple_rooms(code) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    badge_type VARCHAR(32) NOT NULL, -- 'flower', 'star', 'coffee', 'hug'
    count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (pair_code, user_id, badge_type)
);

-- 徽章明细收支流水表
CREATE TABLE IF NOT EXISTS public.badge_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_code VARCHAR(4) NOT NULL REFERENCES public.couple_rooms(code) ON DELETE CASCADE,
    sender_id VARCHAR(64) NOT NULL,
    sender_nickname VARCHAR(64) NOT NULL,
    receiver_id VARCHAR(64) NOT NULL,
    receiver_nickname VARCHAR(64) NOT NULL,
    badge_type VARCHAR(32) NOT NULL,
    delta INT NOT NULL, -- 奖励为正，扣除为负
    reason TEXT,
    post_id UUID REFERENCES public.couple_posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 动态贴纸表态表 (Post Reactions)
CREATE TABLE IF NOT EXISTS public.post_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_code VARCHAR(4) NOT NULL REFERENCES public.couple_rooms(code) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.couple_posts(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    user_nickname VARCHAR(64) NOT NULL,
    emoji VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (post_id, user_id, emoji)
);

-- 4. 实时状态表 (User Status)
CREATE TABLE IF NOT EXISTS public.user_status (
    user_id VARCHAR(64) PRIMARY KEY,
    pair_code VARCHAR(4) NOT NULL REFERENCES public.couple_rooms(code) ON DELETE CASCADE,
    status_icon VARCHAR(32) NOT NULL,
    status_text TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 核心查询索引优化
CREATE INDEX IF NOT EXISTS idx_couple_posts_parent ON public.couple_posts(parent_id);
CREATE INDEX IF NOT EXISTS idx_badge_balances_pair ON public.badge_balances(pair_code, user_id);
CREATE INDEX IF NOT EXISTS idx_badge_logs_pair ON public.badge_logs(pair_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_user_status_pair ON public.user_status(pair_code);

-- 6. 安全开启 Supabase Realtime 复制 (幂等异常保护，重复执行不报错)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.badge_balances;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.badge_logs;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.post_reactions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_status;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 7. 启用行级安全策略 (RLS) 与全权读写策略 (幂等更新)
ALTER TABLE public.badge_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-write for badge_balances" ON public.badge_balances;
CREATE POLICY "Allow public read-write for badge_balances" ON public.badge_balances FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for badge_logs" ON public.badge_logs;
CREATE POLICY "Allow public read-write for badge_logs" ON public.badge_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for post_reactions" ON public.post_reactions;
CREATE POLICY "Allow public read-write for post_reactions" ON public.post_reactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for user_status" ON public.user_status;
CREATE POLICY "Allow public read-write for user_status" ON public.user_status FOR ALL USING (true) WITH CHECK (true);

-- 8. 存储桶配置：chat-media（用于多媒体聊天图片与手绘涂鸦，支持公开上传与读取）
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow public select on chat-media" ON storage.objects;
    CREATE POLICY "Allow public select on chat-media" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');

    DROP POLICY IF EXISTS "Allow public insert on chat-media" ON storage.objects;
    CREATE POLICY "Allow public insert on chat-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-media');

    DROP POLICY IF EXISTS "Allow public update on chat-media" ON storage.objects;
    CREATE POLICY "Allow public update on chat-media" ON storage.objects FOR UPDATE USING (bucket_id = 'chat-media');

    DROP POLICY IF EXISTS "Allow public delete on chat-media" ON storage.objects;
    CREATE POLICY "Allow public delete on chat-media" ON storage.objects FOR DELETE USING (bucket_id = 'chat-media');
END $$;
