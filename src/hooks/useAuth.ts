import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  username: string | null;
  nickname: string | null;
  phone: string | null;
  show_contact: boolean;
  role: string;
  rating_as_sender?: number;
  rating_as_carrier?: number;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadProfile = async (user: User | null) => {
      if (!user) {
        if (active) setProfile(null);
        return;
      }
      const [{ data }, { data: contact }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("profile_contacts").select("phone").eq("user_id", user.id).maybeSingle(),
      ]);
      if (active) setProfile(data ? ({ ...data, phone: contact?.phone ?? null } as Profile) : null);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
      void loadProfile(data.session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setTimeout(() => void loadProfile(next?.user ?? null), 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, profile, loading, setProfile };
}
