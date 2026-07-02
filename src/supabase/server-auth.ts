import type { User } from "@supabase/supabase-js";
import { createSupabaseAdmin } from "@/src/supabase/admin";

export async function getAuthenticatedRequestUser(request: Request) {
  const supabase = createSupabaseAdmin();
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    return {
      supabase,
      user: null as User | null,
      error: "Sign in to do that.",
      status: 401
    };
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return {
      supabase,
      user: null as User | null,
      error: "Your session expired. Sign in again.",
      status: 401
    };
  }

  return {
    supabase,
    user: data.user,
    error: "",
    status: 200
  };
}
