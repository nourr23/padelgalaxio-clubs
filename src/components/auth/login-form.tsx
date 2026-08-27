"use client";

import { FormEvent, useState } from "react";

const CLUBS = ["Galaxio Club Madrid", "Galaxio Club Lisbon", "Galaxio Club Nice"];

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [clubEnabled, setClubEnabled] = useState(true);
  const [club, setClub] = useState(CLUBS[0]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Welcome back
        </h2>
        <p className="mt-2 text-[15px] text-muted">
          Manage your club&apos;s heartbeat from a single portal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="rounded-2xl bg-field p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-sm font-medium text-foreground">
              <BuildingIcon />
              <span>Select Managed Club</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={clubEnabled}
              aria-label="Enable club selection"
              onClick={() => setClubEnabled((value) => !value)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                clubEnabled ? "bg-brand-soft" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                  clubEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <div className="relative">
            <select
              value={club}
              disabled={!clubEnabled}
              onChange={(event) => setClub(event.target.value)}
              className="w-full appearance-none rounded-xl border border-border bg-panel px-4 py-3 pr-10 text-sm text-foreground outline-none transition focus:border-brand-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {CLUBS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted">
              <ChevronIcon />
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-[11px] font-semibold tracking-[0.14em] text-muted uppercase"
          >
            Email Address
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">
              <MailIcon />
            </span>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="manager@padelgalaxio.com"
              className="w-full rounded-xl border border-border bg-panel py-3 pr-4 pl-11 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-brand-soft"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase"
            >
              Password
            </label>
            <a
              href="#"
              className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase transition-colors hover:text-brand"
            >
              Forgot?
            </a>
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">
              <LockIcon />
            </span>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              defaultValue="password"
              className="w-full rounded-xl border border-border bg-panel py-3 pr-11 pl-11 text-sm text-foreground outline-none transition focus:border-brand-soft"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted transition-colors hover:text-brand"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Sign In to Dashboard
          <span
            aria-hidden
            className="transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Trouble accessing your account?{" "}
        <a href="#" className="font-semibold text-foreground hover:text-brand">
          Contact Club Support
        </a>
      </p>
    </div>
  );
}

function BuildingIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M4 21V9l8-5 8 5v12" />
      <path d="M9 21v-6h6v6" />
      <path d="M10 9h.01M14 9h.01M10 13h.01M14 13h.01" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-2.2 3.1" />
      <path d="M6.1 6.1A18 18 0 0 0 2 12s3.5 7 10 7a10.4 10.4 0 0 0 4.2-.9" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
