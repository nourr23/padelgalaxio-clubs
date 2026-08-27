import type { Metadata } from "next";
import { AuthShell } from "@/src/components/auth/auth-shell";
import { LoginForm } from "@/src/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Padel Galaxio club management portal.",
};

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
