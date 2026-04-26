import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const PROJECT_REF = "nuhxuoniculevilhxjsw";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im51aHh1b25pY3VsZXZpbGh4anN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNDE5NzAsImV4cCI6MjA5MjcxNzk3MH0.B8skvUurNDYXHW6URrh9tJd7KsxFqHqy0D2Zr93NiUo".trim();

const isNode = typeof window === "undefined";
const isWeb = Platform.OS === "web";

let authOptions = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
};

if (!isNode && !isWeb) {
  const AsyncStorage =
    require("@react-native-async-storage/async-storage").default;
  authOptions = { ...authOptions, storage: AsyncStorage };
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: authOptions,
});