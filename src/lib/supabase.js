import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'tokobersama-auth',
    // --- TAMBAHKAN BARIS INI UNTUK FIX BENGONG 5 DETIK ---
    skipStorageLock: true, 
  },
  global: {
    fetch: (...args) => fetch(...args),
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});
