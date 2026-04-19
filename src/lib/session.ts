"use client";

// Ultra-light per-device identity. V1 doesn't require Supabase Auth —
// a userId is minted on first pool join and stored locally.

const USER_KEY = "qm_user_id";
const USER_NAME = "qm_user_name";
const POOL_KEY = "qm_pool_id";

export function getStoredUser(): { id: string | null; name: string | null; poolId: string | null } {
  if (typeof window === "undefined") return { id: null, name: null, poolId: null };
  return {
    id: localStorage.getItem(USER_KEY),
    name: localStorage.getItem(USER_NAME),
    poolId: localStorage.getItem(POOL_KEY),
  };
}

export function setStoredUser(u: { id: string; name: string; poolId: string }) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, u.id);
  localStorage.setItem(USER_NAME, u.name);
  localStorage.setItem(POOL_KEY, u.poolId);
}

export function clearStoredUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(USER_NAME);
  localStorage.removeItem(POOL_KEY);
}
