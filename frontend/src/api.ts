const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function req(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const data = await res.json();
      msg = data.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listProfiles: () => req('/profiles'),
  getProfile: (id: string) => req(`/profiles/${id}`),
  verifyPin: (profile_id: string, pin: string) =>
    req('/profiles/verify-pin', { method: 'POST', body: JSON.stringify({ profile_id, pin }) }),
  changePin: (profile_id: string, new_pin: string, boss_pin: string) =>
    req('/profiles/change-pin', { method: 'POST', body: JSON.stringify({ profile_id, new_pin, boss_pin }) }),
  updateProfile: (id: string, body: any) =>
    req(`/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  generateAvatar: (profile_id: string, prompt: string) =>
    req('/profiles/generate-avatar', { method: 'POST', body: JSON.stringify({ profile_id, prompt }) }),
  clearAvatarImage: (id: string) => req(`/profiles/${id}/avatar-image`, { method: 'DELETE' }),

  listQuests: (params: { category?: string; profile_id?: string } = {}) => {
    const qs = new URLSearchParams(params as any).toString();
    return req(`/quests${qs ? '?' + qs : ''}`);
  },
  createQuest: (body: any) => req('/quests', { method: 'POST', body: JSON.stringify(body) }),
  updateQuest: (id: string, body: any) =>
    req(`/quests/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteQuest: (id: string) => req(`/quests/${id}`, { method: 'DELETE' }),

  submitCompletion: (quest_id: string, profile_id: string, use_double_xp = false, photo?: string) =>
    req('/completions', { method: 'POST', body: JSON.stringify({ quest_id, profile_id, use_double_xp, photo }) }),
  listCompletions: (params: { status?: string; profile_id?: string } = {}) => {
    const qs = new URLSearchParams(params as any).toString();
    return req(`/completions${qs ? '?' + qs : ''}`);
  },
  approveCompletion: (id: string) => req(`/completions/${id}/approve`, { method: 'POST' }),
  rejectCompletion: (id: string) => req(`/completions/${id}/reject`, { method: 'POST' }),

  spinWheel: (pid: string) => req(`/wheel/spin/${pid}`, { method: 'POST' }),
  wheelRewards: () => req('/wheel/rewards'),

  leaderboard: () => req('/leaderboard'),
  statsOverview: () => req('/stats/overview'),

  createPayout: (profile_id: string, amount: number, note = '') =>
    req('/payouts', { method: 'POST', body: JSON.stringify({ profile_id, amount, note }) }),
  listPayouts: (profile_id?: string) =>
    req(`/payouts${profile_id ? '?profile_id=' + profile_id : ''}`),

  meta: () => req('/meta'),
};

export type Profile = {
  id: string;
  name: string;
  role: 'kid' | 'boss';
  avatar_class: string;
  avatar_image?: string | null;
  equipped_gear: Record<string, string | null>;
  xp: number;
  gold: number;
  total_earned: number;
  total_paid: number;
  streak: number;
  wheel_spins: number;
  double_xp_tokens: number;
  skip_tokens: number;
  rank: string;
  level: number;
  next_rank: { name: string; threshold: number; xp_to_next: number } | null;
  unlocked_gear: Array<{ id: string; name: string; slot: string; level: number; icon: string }>;
};

export type Quest = {
  id: string;
  title: string;
  description: string;
  category: 'daily' | 'weekly' | 'extra';
  xp: number;
  gold: number;
  assigned_to: string;
  icon: string;
  active: boolean;
  photo_required?: boolean;
};

export type Completion = {
  id: string;
  quest_id: string;
  quest_title: string;
  quest_category: string;
  profile_id: string;
  profile_name: string;
  xp: number;
  gold: number;
  bonus_xp: number;
  photo?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  resolved_at?: string;
};
