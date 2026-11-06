"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type FieldPath,
} from "react-hook-form";

import { IconSave } from "@/src/components/dashboard/icons";
import { toDisplayTime } from "@/src/features/clubs/validation";
import { saveClubPricing } from "@/src/features/pricing/actions";
import {
  WEEK_DAYS,
  WEEKDAYS,
  WEEKEND,
  buildPricingFormSchema,
  resolveTargetCourtIds,
  type PricingCourt,
  type PricingFormInput,
  type PricingGroupInput,
  type PricingTarget,
} from "@/src/features/pricing/validation";
import { getDaySlotStartsForClub } from "@/src/features/schedule/slots";
import type { Club } from "@/src/types/database";

type PricingEditorProps = {
  club: Club;
  courts: PricingCourt[];
  initialGroups: PricingGroupInput[];
};

const inputClassName =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand-soft";

const chipBase =
  "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";
const chipOn = "border-brand bg-brand text-white";
const chipOff = "border-border bg-white text-foreground/70 hover:border-brand-soft";

export function PricingEditor({ club, courts, initialGroups }: PricingEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const open = toDisplayTime(club.first_slot_start) || "00:00";
  const close = toDisplayTime(club.last_session_end) || "23:59";

  const schema = useMemo(
    () => buildPricingFormSchema({ open, close, courts }),
    [open, close, courts],
  );

  const {
    control,
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<PricingFormInput>({
    resolver: zodResolver(schema),
    defaultValues: { groups: initialGroups },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "groups" });
  const groups = useWatch({ control, name: "groups" });

  const hasIndoor = courts.some((court) => court.environment === "indoor");
  const hasOutdoor = courts.some((court) => court.environment === "outdoor");

  function addGroup() {
    append({
      days: [...WEEKDAYS],
      from: open,
      to: close,
      price: Number.NaN,
      target: "all",
    });
  }

  function onSubmit(values: PricingFormInput) {
    setServerError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveClubPricing(club.id, values.groups);
      if (!result.ok) {
        setServerError(result.error);
        for (const [path, messages] of Object.entries(result.fieldErrors ?? {})) {
          setError(path as FieldPath<PricingFormInput>, { message: messages[0] });
        }
        return;
      }
      reset(values);
      setSaved(true);
      router.refresh();
    });
  }

  if (!courts.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-panel px-6 py-12 text-center">
        <p className="font-medium text-foreground">No active courts</p>
        <p className="mt-2 text-sm text-muted">
          Add or reactivate a court before setting session prices.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <p className="rounded-xl border border-border bg-panel px-4 py-3 text-sm text-muted">
          A slot uses the price of the rule that contains its <strong>start time</strong>.
          Rules for specific days override &ldquo;Every day&rdquo; rules at the same
          times, so you can set a default and override it for, say, the weekend. Club
          hours: {open}–{close}.
        </p>

        {fields.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-panel px-6 py-10 text-center text-sm text-muted">
            No price rules yet. Players won&apos;t see a price until you add one.
          </div>
        ) : null}

        {fields.map((field, index) => {
          const groupErrors = errors.groups?.[index];
          const targetError = groupErrors?.target as
            | { message?: string; courtIds?: { message?: string } }
            | undefined;

          return (
            <div
              key={field.id}
              className="rounded-2xl border border-border bg-panel p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
                  Rule {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-sm font-medium text-red-600 transition hover:text-red-700"
                >
                  Delete
                </button>
              </div>

              <div className="space-y-4">
                <Controller
                  control={control}
                  name={`groups.${index}.days`}
                  render={({ field: daysField }) => (
                    <FieldBlock label="Days" error={groupErrors?.days?.message}>
                      <DayPicker value={daysField.value} onChange={daysField.onChange} />
                    </FieldBlock>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  <FieldBlock label="From" error={groupErrors?.from?.message}>
                    <input
                      type="time"
                      step={60}
                      className={inputClassName}
                      {...register(`groups.${index}.from`)}
                    />
                  </FieldBlock>
                  <FieldBlock label="To" error={groupErrors?.to?.message}>
                    <input
                      type="time"
                      step={60}
                      className={inputClassName}
                      {...register(`groups.${index}.to`)}
                    />
                  </FieldBlock>
                  <FieldBlock label="Price (TND)" error={groupErrors?.price?.message}>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      className={inputClassName}
                      {...register(`groups.${index}.price`, { valueAsNumber: true })}
                    />
                  </FieldBlock>
                </div>

                <Controller
                  control={control}
                  name={`groups.${index}.target`}
                  render={({ field: targetField }) => (
                    <FieldBlock
                      label="Courts"
                      error={targetError?.message ?? targetError?.courtIds?.message}
                    >
                      <TargetPicker
                        value={targetField.value}
                        onChange={targetField.onChange}
                        courts={courts}
                        hasIndoor={hasIndoor}
                        hasOutdoor={hasOutdoor}
                      />
                    </FieldBlock>
                  )}
                />
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={addGroup}
          className="w-full rounded-xl border border-dashed border-border px-4 py-3 text-sm font-semibold text-brand transition hover:border-brand-soft"
        >
          + Add price rule
        </button>

        {serverError ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            {serverError}
          </p>
        ) : null}

        {saved && !isDirty ? (
          <p className="text-sm font-medium text-brand-soft">Prices saved.</p>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending || !isDirty}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            <IconSave />
            {pending ? "Saving…" : "Save prices"}
          </button>
        </div>
      </form>

      <PricingPreview club={club} courts={courts} groups={groups ?? []} />
    </div>
  );
}

function DayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  const sameAs = (days: number[]) =>
    value.length === days.length && days.every((day) => value.includes(day));

  function toggle(day: number) {
    onChange(
      value.includes(day) ? value.filter((d) => d !== day) : [...value, day],
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {WEEK_DAYS.map((day) => (
        <button
          key={day.value}
          type="button"
          onClick={() => toggle(day.value)}
          className={`${chipBase} ${value.includes(day.value) ? chipOn : chipOff}`}
        >
          {day.short}
        </button>
      ))}
      <span className="mx-1 h-5 w-px bg-border" aria-hidden />
      <button
        type="button"
        onClick={() => onChange([...WEEKDAYS])}
        className={`${chipBase} ${sameAs(WEEKDAYS) ? chipOn : chipOff}`}
      >
        Weekdays
      </button>
      <button
        type="button"
        onClick={() => onChange([...WEEKEND])}
        className={`${chipBase} ${sameAs(WEEKEND) ? chipOn : chipOff}`}
      >
        Weekend
      </button>
      <button
        type="button"
        onClick={() => onChange([])}
        className={`${chipBase} ${value.length === 0 ? chipOn : chipOff}`}
      >
        Every day
      </button>
    </div>
  );
}

function TargetPicker({
  value,
  onChange,
  courts,
  hasIndoor,
  hasOutdoor,
}: {
  value: PricingTarget;
  onChange: (target: PricingTarget) => void;
  courts: PricingCourt[];
  hasIndoor: boolean;
  hasOutdoor: boolean;
}) {
  const picked = typeof value === "object" ? value.courtIds : null;

  function toggleCourt(courtId: string) {
    if (!picked) return;
    onChange({
      courtIds: picked.includes(courtId)
        ? picked.filter((id) => id !== courtId)
        : courts.filter((c) => c.id === courtId || picked.includes(c.id)).map((c) => c.id),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange("all")}
          className={`${chipBase} ${value === "all" ? chipOn : chipOff}`}
        >
          All courts
        </button>
        <button
          type="button"
          disabled={!hasIndoor}
          onClick={() => onChange("indoor")}
          className={`${chipBase} ${value === "indoor" ? chipOn : chipOff}`}
        >
          Indoor
        </button>
        <button
          type="button"
          disabled={!hasOutdoor}
          onClick={() => onChange("outdoor")}
          className={`${chipBase} ${value === "outdoor" ? chipOn : chipOff}`}
        >
          Outdoor
        </button>
        <button
          type="button"
          onClick={() => onChange({ courtIds: picked ?? [] })}
          className={`${chipBase} ${picked ? chipOn : chipOff}`}
        >
          Pick courts
        </button>
      </div>

      {picked ? (
        <div className="flex flex-wrap gap-2">
          {courts.map((court) => (
            <label
              key={court.id}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground"
            >
              <input
                type="checkbox"
                checked={picked.includes(court.id)}
                onChange={() => toggleCourt(court.id)}
              />
              {court.name}
              {court.environment ? (
                <span className="text-muted">· {court.environment}</span>
              ) : null}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type PreviewScope = "all" | "indoor" | "outdoor" | `court:${string}`;

/** Same lookup as the player app: start time in [from, to), specific days beat every-day rules. */
function priceForSlot(
  groups: PricingGroupInput[],
  resolved: string[][],
  courtId: string,
  day: number,
  start: string,
): number | null {
  let fallback: number | null = null;
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (!Number.isFinite(group.price)) continue;
    if (!resolved[i].includes(courtId)) continue;
    if (!(group.from <= start && start < group.to)) continue;
    if (group.days.length === 0) {
      fallback ??= group.price;
    } else if (group.days.includes(day)) {
      return group.price;
    }
  }
  return fallback;
}

function PricingPreview({
  club,
  courts,
  groups,
}: {
  club: Club;
  courts: PricingCourt[];
  groups: PricingGroupInput[];
}) {
  const hasIndoor = courts.some((court) => court.environment === "indoor");
  const hasOutdoor = courts.some((court) => court.environment === "outdoor");
  const [scope, setScope] = useState<PreviewScope>(
    hasIndoor ? "indoor" : hasOutdoor ? "outdoor" : "all",
  );

  const slots = getDaySlotStartsForClub(club);
  const scopeCourts = scope.startsWith("court:")
    ? courts.filter((court) => `court:${court.id}` === scope)
    : resolveTargetCourtIds(scope as "all" | "indoor" | "outdoor", courts).map(
        (id) => courts.find((court) => court.id === id)!,
      );
  const resolved = groups.map((group) =>
    group?.target ? resolveTargetCourtIds(group.target, courts) : [],
  );

  return (
    <section className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-brand">Preview</h2>
          <p className="mt-1 text-sm text-muted">
            What players see for each slot, by start time. Updates as you edit.
          </p>
        </div>
        <select
          value={scope}
          onChange={(event) => setScope(event.target.value as PreviewScope)}
          className={`${inputClassName} w-auto`}
          aria-label="Preview courts"
        >
          <option value="all">All courts</option>
          {hasIndoor ? <option value="indoor">Indoor courts</option> : null}
          {hasOutdoor ? <option value="outdoor">Outdoor courts</option> : null}
          {courts.map((court) => (
            <option key={court.id} value={`court:${court.id}`}>
              {court.name}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="px-2 py-2 text-left text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
                Slot
              </th>
              {WEEK_DAYS.map((day) => (
                <th
                  key={day.value}
                  className="px-2 py-2 text-center text-[11px] font-semibold tracking-[0.14em] text-muted uppercase"
                >
                  {day.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot.start} className="border-t border-border">
                <td className="px-2 py-2 whitespace-nowrap text-foreground/80">
                  {slot.start}–{slot.end}
                </td>
                {WEEK_DAYS.map((day) => {
                  const prices = scopeCourts.map((court) =>
                    priceForSlot(groups, resolved, court.id, day.value, slot.start),
                  );
                  const known = [
                    ...new Set(prices.filter((p): p is number => p !== null)),
                  ].sort((a, b) => a - b);
                  const missing = prices.some((p) => p === null);
                  return (
                    <td
                      key={day.value}
                      title={missing ? "Some courts have no price for this slot" : undefined}
                      className={`px-2 py-2 text-center tabular-nums ${
                        missing
                          ? "bg-red-50 font-medium text-red-700"
                          : "text-foreground"
                      }`}
                    >
                      {known.length ? known.join(" / ") : "—"}
                      {missing && known.length ? " *" : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">
        Prices in TND. Red cells have no price for at least one court; players
        won&apos;t see a price there.
      </p>
    </section>
  );
}

function FieldBlock({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 block text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
        {label}
      </p>
      {children}
      {error ? <p className="mt-1.5 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
