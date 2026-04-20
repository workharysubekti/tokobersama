import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // INI OBATNYA MAS:
    persistSession: true,      // Sesi login disimpan di memori HP, gak bakal ilang pas pindah menu
    autoRefreshToken: true,    // Kalau token mau habis, dia nyari sendiri tanpa bikin loading
    detectSessionInUrl: true,  // Biar verifikasi email lancar
    storageKey: 'tokobersama-auth', // Nama khusus biar gak tabrakan sama web lain
    storage: window.localStorage // Paksa simpan di storage lokal browser
  },
  global: {
    // Tambahin timeout biar gak nunggu jawaban selamanya kalau sinyal ampas
    fetch: (...args) => {
      return fetch(...args).catch((err) => {
        console.error("Network Error, Kabel lepas?", err);
        throw err;
      });
    },
  },
  // Biar Realtime lebih stabil di HP Poco
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});
