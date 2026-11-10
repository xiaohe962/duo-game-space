'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CoupleRoom, PlayerRole } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

interface PairAuthContextType {
  pairCode: string | null;
  userId: string;
  role: PlayerRole;
  nickname: string;
  pin: string;
  room: CoupleRoom | null;
  isHost: boolean;
  isPaired: boolean;
  isLoading: boolean;
  partnerOnline: boolean;
  partnerNickname: string;
  createRoom: (nickname: string, pin?: string) => Promise<string>;
  joinRoom: (code: string, role: PlayerRole, nickname: string, pin?: string) => Promise<boolean>;
  unbind: () => void;
  updateNickname: (newNickname: string) => Promise<void>;
  refreshRoom: () => Promise<void>;
}

const PairAuthContext = createContext<PairAuthContextType | null>(null);

const STORAGE_KEY_CODE = 'duo_pair_code';
const STORAGE_KEY_ROLE = 'duo_role';
const STORAGE_KEY_PIN = 'duo_pin';
const STORAGE_KEY_NICKNAME = 'duo_nickname';

function generate4DigitCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function PairAuthProvider({ children }: { children: React.ReactNode }) {
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [role, setRole] = useState<PlayerRole>('host');
  const [pin, setPin] = useState<string>('0000');
  const [nickname, setNickname] = useState<string>('Player 1');
  const [room, setRoom] = useState<CoupleRoom | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [partnerOnline, setPartnerOnline] = useState<boolean>(false);

  // 跨设备固定账号哈希 (由房间码与角色确定性派生，保证换设备账号与说说历史严格一致)
  const userId = pairCode ? `pair_${pairCode}_${role}` : '';
  const isHost = role === 'host';
  const isPaired = Boolean(room && room.status === 'paired' && room.guest_user_id);
  const partnerNickname = isHost ? (room?.guest_nickname || '队友') : (room?.host_nickname || '房主');

  // 1. 初始化时读取本地凭据
  useEffect(() => {
    const savedCode = localStorage.getItem(STORAGE_KEY_CODE);
    const savedRole = (localStorage.getItem(STORAGE_KEY_ROLE) as PlayerRole) || 'host';
    const savedPin = localStorage.getItem(STORAGE_KEY_PIN) || '0000';
    const savedNickname = localStorage.getItem(STORAGE_KEY_NICKNAME) || (savedRole === 'host' ? 'Player 1' : 'Player 2');

    setRole(savedRole);
    setPin(savedPin);
    setNickname(savedNickname);

    if (savedCode && savedCode.length === 4) {
      setPairCode(savedCode);
      fetchRoom(savedCode).finally(() => {
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  // 2. 查询房间详情并同步本地状态
  const fetchRoom = useCallback(async (code: string): Promise<CoupleRoom | null> => {
    if (!isSupabaseConfigured) {
      const mockRoom: CoupleRoom = {
        id: 'mock-room-' + code,
        code,
        status: 'paired',
        host_user_id: `pair_${code}_host`,
        host_nickname: 'Player 1',
        host_pin: '0000',
        guest_user_id: `pair_${code}_guest`,
        guest_nickname: 'Player 2',
        guest_pin: '0000',
        host_last_active: new Date().toISOString(),
        guest_last_active: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setRoom(mockRoom);
      return mockRoom;
    }

    try {
      const { data, error } = await supabase
        .from('couple_rooms')
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

      setRoom(data as CoupleRoom);
      return data as CoupleRoom;
    } catch (e) {
      console.warn('获取房间异常:', e);
      return null;
    }
  }, []);

  // 3. 创建新房间（生成 4 位房间码，绑定角色 A 与密钥）
  const createRoom = async (hostNick: string, accessPin: string = '0000'): Promise<string> => {
    const cleanNick = hostNick.trim() || 'Player 1';
    const cleanPin = accessPin.trim() || '0000';
    const code = generate4DigitCode();
    const fixedHostId = `pair_${code}_host`;

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('couple_rooms')
        .insert({
          code,
          status: 'waiting',
          host_user_id: fixedHostId,
          host_nickname: cleanNick,
          host_pin: cleanPin,
          host_last_active: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error('创建房间失败: ' + error.message);
      }
      setRoom(data as CoupleRoom);
    } else {
      setRoom({
        id: 'mock-room-' + code,
        code,
        status: 'waiting',
        host_user_id: fixedHostId,
        host_nickname: cleanNick,
        host_pin: cleanPin,
        guest_user_id: null,
        guest_nickname: null,
        host_last_active: new Date().toISOString(),
        guest_last_active: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    setPairCode(code);
    setRole('host');
    setPin(cleanPin);
    setNickname(cleanNick);
    localStorage.setItem(STORAGE_KEY_CODE, code);
    localStorage.setItem(STORAGE_KEY_ROLE, 'host');
    localStorage.setItem(STORAGE_KEY_PIN, cleanPin);
    localStorage.setItem(STORAGE_KEY_NICKNAME, cleanNick);
    return code;
  };

  // 4. 输入 4 位码加入或跨设备认领登录（支持角色 A / 角色 B + PIN 凭证验证）
  const joinRoom = async (
    code: string,
    targetRole: PlayerRole,
    userNick: string,
    accessPin: string = '0000'
  ): Promise<boolean> => {
    const cleanCode = code.trim();
    if (!/^\d{4}$/.test(cleanCode)) {
      throw new Error('房间码必须为 4 位数字');
    }

    const cleanNick = userNick.trim() || (targetRole === 'host' ? 'Player 1' : 'Player 2');
    const cleanPin = accessPin.trim() || '0000';
    const targetUserId = `pair_${cleanCode}_${targetRole}`;

    if (isSupabaseConfigured) {
      const { data: targetRoom, error: queryError } = await supabase
        .from('couple_rooms')
        .select('*')
        .eq('code', cleanCode)
        .maybeSingle();

      if (queryError || !targetRoom) {
        throw new Error('未找到该 4 位房间码，请确认房主已创建');
      }

      if (targetRole === 'host') {
        // 跨设备登录/认领角色 A (房主)
        if (targetRoom.host_pin && targetRoom.host_pin !== cleanPin) {
          throw new Error('角色 A 的独立登录密钥不正确');
        }
        setRoom(targetRoom as CoupleRoom);
      } else {
        // 角色 B (队员) 操作
        if (targetRoom.guest_user_id) {
          // 角色 B 已存在，跨设备多端登录验证
          if (targetRoom.guest_pin && targetRoom.guest_pin !== cleanPin) {
            throw new Error('角色 B 的独立登录密钥不正确');
          }
          setRoom(targetRoom as CoupleRoom);
        } else {
          // 首次加入成为角色 B
          const { data: updated, error: updateError } = await supabase
            .from('couple_rooms')
            .update({
              guest_user_id: targetUserId,
              guest_nickname: cleanNick,
              guest_pin: cleanPin,
              status: 'paired',
              guest_last_active: new Date().toISOString(),
            })
            .eq('code', cleanCode)
            .select()
            .single();

          if (updateError) {
            throw new Error('加入房间失败: ' + updateError.message);
          }
          setRoom(updated as CoupleRoom);
        }
      }
    } else {
      setRoom({
        id: 'mock-room-' + cleanCode,
        code: cleanCode,
        status: 'paired',
        host_user_id: `pair_${cleanCode}_host`,
        host_nickname: targetRole === 'host' ? cleanNick : 'Player 1',
        host_pin: targetRole === 'host' ? cleanPin : '0000',
        guest_user_id: `pair_${cleanCode}_guest`,
        guest_nickname: targetRole === 'guest' ? cleanNick : 'Player 2',
        guest_pin: targetRole === 'guest' ? cleanPin : '0000',
        host_last_active: new Date().toISOString(),
        guest_last_active: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    setPairCode(cleanCode);
    setRole(targetRole);
    setPin(cleanPin);
    setNickname(cleanNick);
    localStorage.setItem(STORAGE_KEY_CODE, cleanCode);
    localStorage.setItem(STORAGE_KEY_ROLE, targetRole);
    localStorage.setItem(STORAGE_KEY_PIN, cleanPin);
    localStorage.setItem(STORAGE_KEY_NICKNAME, cleanNick);
    return true;
  };

  // 5. 退出绑定
  const unbind = () => {
    localStorage.removeItem(STORAGE_KEY_CODE);
    localStorage.removeItem(STORAGE_KEY_ROLE);
    localStorage.removeItem(STORAGE_KEY_PIN);
    setPairCode(null);
    setRoom(null);
    setPartnerOnline(false);
  };

  // 6. 更新昵称
  const updateNickname = async (newNickname: string) => {
    const clean = newNickname.trim() || '玩家';
    setNickname(clean);
    localStorage.setItem(STORAGE_KEY_NICKNAME, clean);

    if (isSupabaseConfigured && pairCode && room) {
      const field = isHost ? 'host_nickname' : 'guest_nickname';
      await supabase
        .from('couple_rooms')
        .update({ [field]: clean })
        .eq('code', pairCode);
    }
  };

  // 7. 刷新房间数据
  const refreshRoom = async () => {
    if (pairCode) {
      await fetchRoom(pairCode);
    }
  };

  // 8. 实时心跳上报
  useEffect(() => {
    if (!pairCode || !userId) return;

    const reportHeartbeat = async () => {
      const nowIso = new Date().toISOString();
      if (isSupabaseConfigured) {
        const updateField = isHost ? 'host_last_active' : 'guest_last_active';
        await supabase
          .from('couple_rooms')
          .update({ [updateField]: nowIso })
          .eq('code', pairCode);
      }

      if (room) {
        const partnerActiveTime = isHost ? room.guest_last_active : room.host_last_active;
        if (partnerActiveTime) {
          const diffMs = Date.now() - new Date(partnerActiveTime).getTime();
          setPartnerOnline(diffMs < 35000);
        } else {
          setPartnerOnline(false);
        }
      }
    };

    reportHeartbeat();
    const timer = setInterval(reportHeartbeat, 12000);
    return () => clearInterval(timer);
  }, [pairCode, userId, isHost, room]);

  // 9. 订阅 Supabase Realtime
  useEffect(() => {
    if (!pairCode || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`room_${pairCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'couple_rooms',
          filter: `code=eq.${pairCode}`,
        },
        (payload) => {
          if (payload.new) {
            setRoom(payload.new as CoupleRoom);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pairCode]);

  return (
    <PairAuthContext.Provider
      value={{
        pairCode,
        userId,
        role,
        pin,
        nickname,
        room,
        isHost,
        isPaired,
        isLoading,
        partnerOnline,
        partnerNickname,
        createRoom,
        joinRoom,
        unbind,
        updateNickname,
        refreshRoom,
      }}
    >
      {children}
    </PairAuthContext.Provider>
  );
}

export function usePairAuth() {
  const context = useContext(PairAuthContext);
  if (!context) {
    throw new Error('usePairAuth 必须在 PairAuthProvider 内部使用');
  }
  return context;
}
