import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { supabase } from "../src/supaCore";
import { loadCountry } from "../src/preferences";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const [country, setCountry] = useState(null);
  const [countryReady, setCountryReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const syncCountry = async () => {
      if (!ready) return;
      if (!session) {
        if (!cancelled) {
          setCountry(null);
          setCountryReady(true);
        }
        return;
      }
      if (!cancelled) setCountryReady(false);
      const saved = await loadCountry();
      if (!cancelled) {
        setCountry(saved);
        setCountryReady(true);
      }
    };
    syncCountry();
    return () => {
      cancelled = true;
    };
  }, [ready, session]);

  useEffect(() => {
    if (!ready) return;
    if (!countryReady) return;
    const inAuth = segments[0] === "auth";
    const inOnboarding = segments[0] === "onboarding";
    const inLegal = segments[0] === "legal";
    if (!session && !inAuth && !inLegal) {
      router.replace("/auth/login");
      return;
    }
    if (session && !country && !inOnboarding) {
      router.replace("/onboarding/country");
      return;
    }
    if (session && country && inAuth) {
      router.replace("/(tabs)");
    }
  }, [ready, countryReady, country, session, segments, router]);

  if (!ready || !countryReady) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}