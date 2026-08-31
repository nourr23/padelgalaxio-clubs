import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Courts",
};

export default function CourtsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-brand">
        Courts.
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        Court management is next — this page is a placeholder for now.
      </p>
    </div>
  );
}
