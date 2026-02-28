import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured =
  !!supabaseUrl?.trim() &&
  !!supabaseAnonKey?.trim() &&
  !String(supabaseUrl).includes('your-project');

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
