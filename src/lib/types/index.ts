// ========================================================
// 核心数据模型与状态定义 (v2.0)
// ========================================================

export type RoomStatus = 'waiting' | 'paired' | 'closed';
export type PlayerRole = 'host' | 'guest';

export interface CoupleRoom {
  id: string;
  code: string; // 4位房间码
  status: RoomStatus;
  host_user_id: string;
  host_nickname: string;
  host_pin?: string; // 角色 A 跨设备凭据
  guest_user_id: string | null;
  guest_nickname: string | null;
  guest_pin?: string; // 角色 B 跨设备凭据
  host_last_active: string;
  guest_last_active: string | null;
  created_at: string;
  updated_at: string;
}

// 模块 3：动态空间
export type PostType = 'normal' | 'status' | 'badge_reward' | 'doodle';
export type BadgeType = 'flower' | 'star' | 'coffee' | 'hug';

export interface CouplePost {
  id: string;
  pair_code: string;
  author_id: string;
  author_nickname: string;
  content: string;
  image_url?: string | null;
  mood: string;
  parent_id?: string | null;
  post_type?: PostType;
  created_at: string;
}

export interface BadgeBalance {
  pair_code: string;
  user_id: string;
  badge_type: BadgeType;
  count: number;
  updated_at: string;
}

export interface BadgeLog {
  id: string;
  pair_code: string;
  sender_id: string;
  sender_nickname: string;
  receiver_id: string;
  receiver_nickname: string;
  badge_type: BadgeType;
  delta: number;
  reason?: string | null;
  post_id?: string | null;
  created_at: string;
}

export interface PostReaction {
  id: string;
  pair_code: string;
  post_id: string;
  user_id: string;
  user_nickname: string;
  emoji: string;
  created_at: string;
}

export interface UserStatus {
  user_id: string;
  pair_code: string;
  status_icon: string;
  status_text: string;
  updated_at: string;
}

// 模块 1：GuessWhat
export type GuessSessionStatus = 'word_selection' | 'playing' | 'settled';
export type AnswerType = 'yes' | 'no' | 'uncertain';

export interface GuessSession {
  id: string;
  pair_code: string;
  round_number: number;
  status: GuessSessionStatus;
  master_id: string;
  guesser_id: string;
  theme: string;
  secret_word: string | null;
  secret_word_category: string | null;
  secret_word_note: string | null;
  questions_count: number;
  wrong_guesses_count: number;
  result: 'guessed' | 'surrendered' | null;
  created_at: string;
  ended_at: string | null;
}

export interface GuessQuestion {
  id: string;
  session_id: string;
  pair_code: string;
  question_number: number;
  text: string;
  answer: AnswerType | null;
  answered_at: string | null;
  created_at: string;
}

export interface GuessRecord {
  id: string;
  session_id: string;
  pair_code: string;
  guess_text: string;
  is_correct: boolean;
  created_at: string;
}

// 模块 2：你画我猜
export type DrawSessionStatus = 'word_selection' | 'drawing' | 'settled';

export interface DrawSession {
  id: string;
  pair_code: string;
  round_number: number;
  status: DrawSessionStatus;
  painter_id: string;
  guesser_id: string;
  word: string;
  category: string;
  hint: string;
  remaining_seconds: number;
  winner_id: string | null;
  scores: {
    host: number;
    guest: number;
  };
  created_at: string;
  ended_at: string | null;
}

export interface DrawMessage {
  id: string;
  pair_code: string;
  session_id: string;
  sender_id: string;
  sender_nickname: string;
  message: string;
  is_system: boolean;
  is_correct: boolean;
  created_at: string;
}

export interface DrawStrokePoint {
  x: number; // 相对比例 0~1 (支持任意屏宽自适应无损缩放)
  y: number; // 相对比例 0~1
}

export interface DrawStrokePayload {
  type: 'draw' | 'clear' | 'undo';
  color?: string;
  size?: number;
  from?: DrawStrokePoint;
  to?: DrawStrokePoint;
  control?: DrawStrokePoint; // 贝塞尔控制点
}
