import { supabase } from "@/src/supabase/client";

export async function getBearerAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error("Sign in again to do that.");
  }

  return {
    Authorization: `Bearer ${accessToken}`
  };
}
