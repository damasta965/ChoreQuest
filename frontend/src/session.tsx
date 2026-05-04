import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, Profile } from './api';

type SessionCtx = {
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<SessionCtx>({
  profile: null,
  setProfile: () => {},
  refresh: async () => {},
  logout: async () => {},
});

const KEY = 'cq_profile_id';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);

  const setProfile = useCallback((p: Profile | null) => {
    setProfileState(p);
    if (p) AsyncStorage.setItem(KEY, p.id);
    else AsyncStorage.removeItem(KEY);
  }, []);

  const refresh = useCallback(async () => {
    if (!profile) return;
    try {
      const p = await api.getProfile(profile.id);
      setProfileState(p);
    } catch {}
  }, [profile]);

  const logout = useCallback(async () => {
    setProfileState(null);
    await AsyncStorage.removeItem(KEY);
  }, []);

  useEffect(() => {
    // attempt restore
    (async () => {
      const id = await AsyncStorage.getItem(KEY);
      if (id) {
        try {
          const p = await api.getProfile(id);
          setProfileState(p);
        } catch {}
      }
    })();
  }, []);

  return <Ctx.Provider value={{ profile, setProfile, refresh, logout }}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);
