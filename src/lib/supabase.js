import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL; // Ambil dari .env
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY; // Ambil dari .env

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
