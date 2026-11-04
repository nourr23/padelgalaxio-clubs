import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Server Components can't clear auth cookies, so the dashboard layout sends
// users who fail the access check here. Without this, the proxy would bounce
// the still-valid session from /login back to /dashboard in a loop.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", request.url));
}
