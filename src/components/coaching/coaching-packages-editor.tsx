"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type FieldPath,
  type UseFormRegister,
} from "react-hook-form";

import { IconSave } from "@/src/components/dashboard/icons";
import {
  deleteCoachingPackage,
  saveCoachingPackages,
  setCoachingPackageActive,
} from "@/src/features/coaching/actions";
import type { ClubCoachingPackage } from "@/src/features/coaching/queries";
import {
  coachingPackagesFormSchema,
  formatPrice,
  packageLabel,
  perGroupPrice,
  perPersonPrice,
  type CoachingPackageFormItem,
  type CoachingPackagesFormInput,
} from "@/src/features/coaching/validation";
import type { CoachingPackageKind } from "@/src/types/database";

type CoachingPackagesEditorProps = {
  clubId: string;
  initialPackages: ClubCoachingPackage[];
};

const inputClassName =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand-soft";

const chipBase =
  "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";
const chipOn = "border-brand bg-brand text-white";
const chipOff = "border-border bg-white text-foreground/70 hover:border-brand-soft";

const smallButton =
  "rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-brand-soft disabled:cursor-not-allowed disabled:opacity-40";

const KINDS: { kind: CoachingPackageKind; title: string; hint: string }[] = [
  {
    kind: "monthly",
    title: "Monthly offers",
    hint: "A fixed number of sessions each month, usually priced per person.",
  },
  {
    kind: "per_session",
    title: "Per session",
    hint: "One coaching session, priced for the whole group or per person.",
  },
];

/** Bardo Padel Club's poster: the owner edits these before saving. */
const QUICK_START: CoachingPackageFormItem[] = [
  draft({ kind: "monthly", groupSize: 4, sessionsPerMonth: 4, price: 150, priceBasis: "per_person" }),
  draft({ kind: "monthly", groupSize: 4, sessionsPerMonth: 8, price: 250, priceBasis: "per_person" }),
  draft({ kind: "per_session", groupSize: 1, price: 70, priceBasis: "per_group" }),
  draft({ kind: "per_session", groupSize: 2, price: 100, priceBasis: "per_group" }),
  draft({ kind: "per_session", groupSize: 3, price: 135, priceBasis: "per_group" }),
  draft({ kind: "per_session", groupSize: 4, price: 160, priceBasis: "per_group" }),
];

function draft(
  values: Partial<CoachingPackageFormItem> & { kind: CoachingPackageKind },
): CoachingPackageFormItem {
  return {
    id: null,
    title: "",
    groupSize: values.kind === "monthly" ? 4 : 1,
    sessionsPerMonth: values.kind === "monthly" ? 4 : null,
    sessionMinutes: null,
    price: Number.NaN,
    priceBasis: values.kind === "monthly" ? "per_person" : "per_group",
    description: "",
    isActive: true,
    ...values,
  };
}

function toFormItem(pkg: ClubCoachingPackage): CoachingPackageFormItem {
  return {
    id: pkg.id,
    kind: pkg.kind,
    title: pkg.title,
    groupSize: pkg.groupSize,
    sessionsPerMonth: pkg.sessionsPerMonth,
    sessionMinutes: pkg.sessionMinutes,
    price: pkg.price,
    priceBasis: pkg.priceBasis,
    description: pkg.description,
    isActive: pkg.isActive,
  };
}

function snapshot(item: CoachingPackageFormItem) {
  return JSON.stringify({
    ...item,
    title: item.title.trim(),
    description: item.description.trim(),
    sessionsPerMonth: item.kind === "monthly" ? item.sessionsPerMonth : null,
  });
}

const optionalNumber = (value: unknown) =>
  value === "" || value == null ? null : Number(value);

type PendingDelete = { index: number; id: string; requestCount: number };

export function CoachingPackagesEditor({
  clubId,
  initialPackages,
}: CoachingPackagesEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const initialItems = initialPackages.map(toFormItem);
  const initialById = new Map(
    initialItems.map((item) => [item.id as string, snapshot(item)]),
  );
  const initialOrder = initialItems.map((item) => item.id).join(",");

  const {
    control,
    register,
    handleSubmit,
    setError,
    getValues,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CoachingPackagesFormInput>({
    resolver: zodResolver(coachingPackagesFormSchema),
    defaultValues: { packages: initialItems },
  });

  const { fields, append, insert, remove, swap } = useFieldArray({
    control,
    name: "packages",
    keyName: "fieldKey",
  });
  const packages = useWatch({ control, name: "packages" }) ?? [];

  const orderChanged =
    packages.map((item) => item?.id ?? "new").join(",") !== initialOrder;

  function indexesOfKind(kind: CoachingPackageKind) {
    return packages
      .map((item, index) => (item?.kind === kind ? index : -1))
      .filter((index) => index >= 0);
  }

  function move(index: number, direction: -1 | 1) {
    const kind = packages[index]?.kind;
    if (!kind) return;
    const same = indexesOfKind(kind);
    const at = same.indexOf(index);
    const target = same[at + direction];
    if (target === undefined) return;
    swap(index, target);
  }

  function duplicate(index: number) {
    const source = getValues(`packages.${index}`);
    insert(index + 1, { ...source, id: null });
  }

  function addPackage(kind: CoachingPackageKind) {
    append(draft({ kind }));
  }

  function quickStart() {
    for (const item of QUICK_START) append({ ...item });
  }

  function runDelete(index: number, force: boolean) {
    const item = getValues(`packages.${index}`);
    if (!item.id) {
      remove(index);
      return;
    }
    const id = item.id;
    // A saved delete reloads the editor, which would drop unsaved edits.
    if (isDirty) {
      setServerError("Save your changes before deleting a saved package.");
      return;
    }
    setServerError(null);
    startTransition(async () => {
      const result = await deleteCoachingPackage(clubId, id, { force });
      if (!result.ok) {
        if (result.requestCount) {
          setPendingDelete({ index, id, requestCount: result.requestCount });
          return;
        }
        setServerError(result.error);
        return;
      }
      setPendingDelete(null);
      router.refresh();
    });
  }

  function deactivateInstead(index: number, id: string) {
    if (isDirty) {
      setServerError("Save your changes first.");
      return;
    }
    setServerError(null);
    startTransition(async () => {
      const result = await setCoachingPackageActive(clubId, id, false);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      setValue(`packages.${index}.isActive`, false);
      setPendingDelete(null);
      router.refresh();
    });
  }

  function onSubmit(values: CoachingPackagesFormInput) {
    setServerError(null);
    setSaved(false);
    const changedIds = values.packages
      .filter((item) => item.id && initialById.get(item.id) !== snapshot(item))
      .map((item) => item.id as string);
    // Reordering changes sort_order, so every saved package of that kind is sent.
    if (orderChanged) {
      for (const item of values.packages) {
        if (item.id && !changedIds.includes(item.id)) changedIds.push(item.id);
      }
    }

    startTransition(async () => {
      const result = await saveCoachingPackages(clubId, values.packages, changedIds);
      if (!result.ok) {
        setServerError(result.error);
        for (const [path, messages] of Object.entries(result.fieldErrors ?? {})) {
          setError(path as FieldPath<CoachingPackagesFormInput>, {
            message: messages[0],
          });
        }
        return;
      }
      setSaved(true);
      // The page remounts this editor with fresh ids once the refresh lands.
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
      {fields.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-panel px-6 py-10 text-center">
          <p className="font-medium text-foreground">No coaching packages yet</p>
          <p className="mt-2 text-sm text-muted">
            Players won&apos;t see coaching at your club until you add one. Start
            from a typical poster and edit the prices.
          </p>
          <button
            type="button"
            onClick={quickStart}
            className="mt-4 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-brand transition hover:bg-accent/90"
          >
            Quick start (6 example packages)
          </button>
        </div>
      ) : null}

      {KINDS.map(({ kind, title, hint }) => {
        const indexes = indexesOfKind(kind);
        return (
          <section key={kind}>
            <div className="mb-3">
              <h3 className="font-display text-lg font-semibold text-brand">{title}</h3>
              <p className="text-sm text-muted">{hint}</p>
            </div>
            <div className="space-y-4">
              {indexes.map((index, position) => {
                const field = fields[index];
                if (!field) return null;
                return (
                  <PackageCard
                    key={field.fieldKey}
                    index={index}
                    control={control}
                    register={register}
                    errors={errors}
                    disabled={pending}
                    isFirst={position === 0}
                    isLast={position === indexes.length - 1}
                    onMove={(direction) => move(index, direction)}
                    onDuplicate={() => duplicate(index)}
                    onDelete={() => runDelete(index, false)}
                    deleteConfirm={
                      pendingDelete && pendingDelete.index === index ? (
                        <DeleteConfirm
                          requestCount={pendingDelete.requestCount}
                          disabled={pending}
                          onDeactivate={() =>
                            deactivateInstead(index, pendingDelete.id)
                          }
                          onForce={() => runDelete(index, true)}
                          onCancel={() => setPendingDelete(null)}
                        />
                      ) : null
                    }
                  />
                );
              })}
              <button
                type="button"
                onClick={() => addPackage(kind)}
                className="w-full rounded-xl border border-dashed border-border px-4 py-3 text-sm font-semibold text-brand transition hover:border-brand-soft"
              >
                + Add {kind === "monthly" ? "monthly offer" : "per-session price"}
              </button>
            </div>
          </section>
        );
      })}

      {serverError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          {serverError}
        </p>
      ) : null}

      {saved && !isDirty ? (
        <p className="text-sm font-medium text-brand-soft">Packages saved.</p>
      ) : null}

      <div className="sticky bottom-4 flex justify-end">
        <button
          type="submit"
          disabled={pending || !isDirty}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          <IconSave />
          {pending ? "Saving…" : "Save packages"}
        </button>
      </div>
    </form>
  );
}

function PackageCard({
  index,
  control,
  register,
  errors,
  disabled,
  isFirst,
  isLast,
  onMove,
  onDuplicate,
  onDelete,
  deleteConfirm,
}: {
  index: number;
  control: Control<CoachingPackagesFormInput>;
  register: UseFormRegister<CoachingPackagesFormInput>;
  errors: FieldErrors<CoachingPackagesFormInput>;
  disabled: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  deleteConfirm: React.ReactNode;
}) {
  const item = useWatch({ control, name: `packages.${index}` });
  const itemErrors = errors.packages?.[index];
  const isMonthly = item?.kind === "monthly";

  return (
    <div
      className={`rounded-2xl border border-border bg-panel p-5 shadow-sm ${
        item?.isActive === false ? "opacity-70" : ""
      }`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            {item ? packageLabel({ title: item.title, groupSize: item.groupSize }) : ""}
          </p>
          {!item?.id ? (
            <span className="rounded-md bg-accent/40 px-1.5 py-0.5 text-[10px] font-semibold text-brand uppercase">
              New
            </span>
          ) : null}
          {item?.isActive === false ? (
            <span className="rounded-md bg-field px-1.5 py-0.5 text-[10px] font-semibold text-muted uppercase">
              Hidden
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className={smallButton}
            disabled={disabled || isFirst}
            onClick={() => onMove(-1)}
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            className={smallButton}
            disabled={disabled || isLast}
            onClick={() => onMove(1)}
            aria-label="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            className={smallButton}
            disabled={disabled}
            onClick={onDuplicate}
          >
            Duplicate
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onDelete}
            className="px-2 text-xs font-medium text-red-600 transition hover:text-red-700 disabled:opacity-40"
          >
            Delete
          </button>
        </div>
      </div>

      {deleteConfirm}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-4">
          <Controller
            control={control}
            name={`packages.${index}.kind`}
            render={({ field }) => (
              <FieldBlock label="Type">
                <div className="flex flex-wrap gap-2">
                  {(["monthly", "per_session"] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => field.onChange(kind)}
                      className={`${chipBase} ${field.value === kind ? chipOn : chipOff}`}
                    >
                      {kind === "monthly" ? "Monthly" : "Per session"}
                    </button>
                  ))}
                </div>
              </FieldBlock>
            )}
          />

          <Controller
            control={control}
            name={`packages.${index}.groupSize`}
            render={({ field }) => (
              <FieldBlock
                label="Players per group"
                error={itemErrors?.groupSize?.message}
              >
                <GroupSizePicker value={field.value} onChange={field.onChange} />
              </FieldBlock>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            {isMonthly ? (
              <FieldBlock
                label="Sessions / month"
                error={itemErrors?.sessionsPerMonth?.message}
              >
                <input
                  type="number"
                  min={1}
                  max={31}
                  inputMode="numeric"
                  className={inputClassName}
                  {...register(`packages.${index}.sessionsPerMonth`, {
                    setValueAs: optionalNumber,
                  })}
                />
              </FieldBlock>
            ) : null}
            <FieldBlock
              label="Minutes (optional)"
              error={itemErrors?.sessionMinutes?.message}
            >
              <input
                type="number"
                min={15}
                max={240}
                step={15}
                inputMode="numeric"
                placeholder="e.g. 90"
                className={inputClassName}
                {...register(`packages.${index}.sessionMinutes`, {
                  setValueAs: optionalNumber,
                })}
              />
            </FieldBlock>
            <FieldBlock label="Price (TND)" error={itemErrors?.price?.message}>
              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                className={inputClassName}
                {...register(`packages.${index}.price`, { valueAsNumber: true })}
              />
            </FieldBlock>
          </div>

          <Controller
            control={control}
            name={`packages.${index}.priceBasis`}
            render={({ field }) => (
              <FieldBlock label="The price is">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => field.onChange("per_person")}
                    className={`${chipBase} ${field.value === "per_person" ? chipOn : chipOff}`}
                  >
                    Per person
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange("per_group")}
                    className={`${chipBase} ${field.value === "per_group" ? chipOn : chipOff}`}
                  >
                    For the whole group
                  </button>
                </div>
              </FieldBlock>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldBlock label="Title (optional)" error={itemErrors?.title?.message}>
              <input
                type="text"
                maxLength={60}
                placeholder={item ? packageLabel({ title: null, groupSize: item.groupSize }) : ""}
                className={inputClassName}
                {...register(`packages.${index}.title`)}
              />
            </FieldBlock>
            <Controller
              control={control}
              name={`packages.${index}.isActive`}
              render={({ field }) => (
                <FieldBlock label="Visible to players">
                  <label className="inline-flex cursor-pointer items-center gap-3 py-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="size-4 accent-brand"
                    />
                    {field.value ? "Active" : "Hidden (deactivated)"}
                  </label>
                </FieldBlock>
              )}
            />
          </div>

          <FieldBlock
            label="Description (optional)"
            error={itemErrors?.description?.message}
          >
            <textarea
              rows={2}
              maxLength={500}
              placeholder="Coach, level, what's included…"
              className={inputClassName}
              {...register(`packages.${index}.description`)}
            />
          </FieldBlock>
        </div>

        {item ? <PlayerPreview item={item} /> : null}
      </div>
    </div>
  );
}

function PlayerPreview({ item }: { item: CoachingPackageFormItem }) {
  const hasPrice = Number.isFinite(item.price) && item.price > 0;
  const groupSize = Number.isFinite(item.groupSize) ? item.groupSize : 1;
  const priced = { price: item.price, priceBasis: item.priceBasis, groupSize };
  const perPerson = hasPrice ? perPersonPrice(priced) : null;
  const perGroup = hasPrice ? perGroupPrice(priced) : null;

  const big = item.priceBasis === "per_person" ? perPerson : perGroup;
  let line: string;
  if (item.kind === "monthly") {
    const sessions = item.sessionsPerMonth ?? "?";
    line = `${sessions} session${sessions === 1 ? "" : "s"} / month · ${
      item.priceBasis === "per_person" ? "per person" : "per group"
    }`;
  } else {
    line = item.priceBasis === "per_person" ? "per person" : "per session";
  }

  let secondary: string | null = null;
  if (hasPrice && groupSize > 1) {
    secondary =
      item.priceBasis === "per_group"
        ? `${formatPrice(perPerson!)} TND per person`
        : `${formatPrice(perGroup!)} TND for the group`;
  }

  return (
    <div className="self-start rounded-xl border border-border bg-white p-4">
      <p className="text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
        Player preview
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">
        {packageLabel({ title: item.title, groupSize })}
        {groupSize > 1 ? (
          <span className="font-normal text-muted"> · {groupSize} players</span>
        ) : null}
      </p>
      <p className="mt-1 font-display text-3xl font-semibold text-brand tabular-nums">
        {big != null ? formatPrice(big) : "—"}
        <span className="ml-1 text-sm font-medium text-muted">TND</span>
      </p>
      <p className="text-sm text-foreground/80">{line}</p>
      {secondary ? <p className="mt-1 text-xs text-muted">{secondary}</p> : null}
      {item.sessionMinutes ? (
        <p className="mt-1 text-xs text-muted">{item.sessionMinutes} min sessions</p>
      ) : null}
      {item.description?.trim() ? (
        <p className="mt-2 line-clamp-3 text-xs text-foreground/70">
          {item.description.trim()}
        </p>
      ) : null}
      {!item.isActive ? (
        <p className="mt-2 text-xs font-medium text-red-600">Hidden from players</p>
      ) : null}
    </div>
  );
}

function GroupSizePicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const isOther = !(value >= 1 && value <= 4);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {[1, 2, 3, 4].map((size) => (
        <button
          key={size}
          type="button"
          onClick={() => onChange(size)}
          className={`${chipBase} ${value === size ? chipOn : chipOff}`}
        >
          {size}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(isOther ? value : 5)}
        className={`${chipBase} ${isOther ? chipOn : chipOff}`}
      >
        Other
      </button>
      {isOther ? (
        <input
          type="number"
          min={5}
          max={8}
          aria-label="Players per group"
          value={Number.isFinite(value) ? value : ""}
          onChange={(event) => onChange(event.target.valueAsNumber)}
          className={`${inputClassName} w-20`}
        />
      ) : null}
    </div>
  );
}

function DeleteConfirm({
  requestCount,
  disabled,
  onDeactivate,
  onForce,
  onCancel,
}: {
  requestCount: number;
  disabled: boolean;
  onDeactivate: () => void;
  onForce: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <p>
        This package has <strong>{requestCount}</strong> player request
        {requestCount === 1 ? "" : "s"}. Deleting it also deletes{" "}
        {requestCount === 1 ? "that request" : "those requests"}. Deactivating hides
        it from players and keeps the history.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onDeactivate}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-deep disabled:opacity-60"
        >
          Deactivate instead
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onForce}
          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
        >
          Delete package and {requestCount} request{requestCount === 1 ? "" : "s"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onCancel}
          className="px-2 text-xs font-medium text-foreground/70"
        >
          Cancel
        </button>
      </div>
    </div>
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
