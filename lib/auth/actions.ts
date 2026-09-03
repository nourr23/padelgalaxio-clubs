"use server";

import { redirect } from "next/navigation";

import {
  assertClubsAppAccess,
  CLUBS_APP_ACCESS_DENIED,
} from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error: string | null;
};

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const access = await assertClubsAppAccess(supabase);
  if (!access.ok) {
    // Same UX as wrong credentials — don’t reveal role / portal eligibility.
    if (access.reason === CLUBS_APP_ACCESS_DENIED) {
      return { error: "Invalid login credentials" };
    }
    return { error: access.reason };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
