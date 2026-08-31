import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Calendar",
};

export default function SchedulePage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-brand">
        Calendar.
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        Read-only schedule view is coming next — placeholder for now.
      </p>
    </div>
  );
}
