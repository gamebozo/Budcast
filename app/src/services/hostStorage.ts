import { Platform } from 'react-native';

const HOST_ID_KEY = 'budcast_host_id';
const HOSTED_ROOMS_KEY = 'budcast_hosted_room_ids';

let memoryHostId = '';
let memoryHostedRooms: string[] = [];

export function getHostId(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    let hostId = window.localStorage.getItem(HOST_ID_KEY);
    if (!hostId) {
      hostId = 'host_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      window.localStorage.setItem(HOST_ID_KEY, hostId);
    }
    return hostId;
  }
  if (!memoryHostId) {
    memoryHostId = 'host_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  }
  return memoryHostId;
}

export function saveHostedRoomId(roomId: string) {
  if (!roomId) return;
  const idStr = roomId.toString();
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(HOSTED_ROOMS_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(idStr)) {
        list.unshift(idStr);
        window.localStorage.setItem(HOSTED_ROOMS_KEY, JSON.stringify(list.slice(0, 50)));
      }
    } catch {
      // fallback
    }
  } else {
    if (!memoryHostedRooms.includes(idStr)) {
      memoryHostedRooms.unshift(idStr);
    }
  }
}

export function getHostedRoomIds(): string[] {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(HOSTED_ROOMS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  return memoryHostedRooms;
}

export function isHostOfRoom(roomId: string): boolean {
  const ids = getHostedRoomIds();
  return ids.includes(roomId.toString());
}

export interface ActivePlanData {
  planId: 'free' | 'pro' | 'business' | 'founder';
  planName: string;
  billingCycle: 'monthly' | 'yearly';
  activatedAt?: string;
  expiresAt?: string;
  founderNumber?: number;
  founderBadge?: string;
  vipCode?: string;
}

const ACTIVE_PLAN_KEY = 'budcast_active_plan';
let memoryActivePlan: ActivePlanData = {
  planId: 'free',
  planName: 'Starter Cinema',
  billingCycle: 'monthly',
};

export function getActivePlan(): ActivePlanData {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(ACTIVE_PLAN_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // fallback
    }
  }
  return memoryActivePlan;
}

export function setActivePlan(plan: ActivePlanData) {
  memoryActivePlan = plan;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(ACTIVE_PLAN_KEY, JSON.stringify(plan));
    } catch {
      // fallback
    }
  }
}

export function setFounderVipPass({ queueNumber, vipCode, role }: { queueNumber: number; vipCode: string; role?: string }) {
  const plan: ActivePlanData = {
    planId: 'founder',
    planName: 'VIP Founder Pass',
    billingCycle: 'yearly',
    activatedAt: new Date().toISOString(),
    founderNumber: queueNumber,
    founderBadge: 'Founder Gold',
    vipCode
  };
  setActivePlan(plan);
  return plan;
}

export function isFounderUser(): boolean {
  const plan = getActivePlan();
  return plan.planId === 'founder' || !!plan.founderBadge;
}

