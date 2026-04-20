import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'tokobersama-auth',
    storage: window.localStorage
  },
  global: {
    // Timeout 10 detik agar tidak bengong selamanya jika sinyal ampas
    fetch: (...args) => {
      const options = args[1] || {};
      return fetch(args[0], { ...options, signal: AbortSignal.timeout(10000) });
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
    // Otomatis nyambung lagi kalau kabel lepas (reconnect)
    reconnectAfterMs: (retries) => Math.min(retries * 1000, 5000),
  },
});
