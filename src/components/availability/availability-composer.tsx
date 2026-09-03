"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  archiveClubAvailabilityPost,
  loadAvailabilityComposerData,
  publishClubAvailabilityPost,
  type AvailabilityComposerData,
} from "@/src/features/availability-posts/actions";
import type { AvailabilityPost } from "@/src/features/availability-posts/api";
import { buildAvailabilityPreview } from "@/src/features/availability-posts/format";
import {
  formatSlotLabelFr,
  maxSelectableDateYmd,
} from "@/src/features/availability-posts/slots";
import { toYmd } from "@/src/features/schedule/slots";
import type { Club } from "@/src/types/database";

type AvailabilityComposerProps = {
  club: Club;
  initialData: AvailabilityComposerData;
};

export function AvailabilityComposer({
  club,
  initialData,
}: AvailabilityComposerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [validForDate, setValidForDate] = useState(initialData.validForDate);
  const [freeSlots, setFreeSlots] = useState(initialData.freeSlots);
  const [existingPost, setExistingPost] = useState(initialData.existingPost);
  const [recentPosts, setRecentPosts] = useState(initialData.recentPosts);

  const [selectedSlots, setSelectedSlots] = useState<string[]>(
    initialData.existingPost?.availabilitySlots ?? [],
  );
  const [description, setDescription] = useState(
    initialData.existingPost?.description ?? "",
  );
  const [price, setPrice] = useState(
    initialData.existingPost?.price != null
      ? String(initialData.existingPost.price)
      : "",
  );
  const [currency, setCurrency] = useState(
    initialData.existingPost?.currency ?? "TND",
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData.existingPost?.image?.publicUrl ?? null,
  );
  const [removeImage, setRemoveImage] = useState(false);

  const todayYmd = toYmd(new Date());
  const maxYmd = maxSelectableDateYmd();
  const skipInitialLoad = useRef(true);

  useEffect(() => {
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }

    setLoading(true);
    setError(null);
    startTransition(async () => {
      const result = await loadAvailabilityComposerData(club.id, validForDate);
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setFreeSlots(result.data.freeSlots);
      setExistingPost(result.data.existingPost);
      setRecentPosts(result.data.recentPosts);

      if (result.data.existingPost) {
        setSelectedSlots(result.data.existingPost.availabilitySlots);
        setDescription(result.data.existingPost.description ?? "");
        setPrice(
          result.data.existingPost.price != null
            ? String(result.data.existingPost.price)
            : "",
        );
        setCurrency(result.data.existingPost.currency ?? "TND");
        setImagePreview(result.data.existingPost.image?.publicUrl ?? null);
        setImageFile(null);
        setRemoveImage(false);
      } else {
        setSelectedSlots([]);
        setDescription("");
        setPrice("");
        setCurrency("TND");
        setImagePreview(null);
        setImageFile(null);
        setRemoveImage(false);
      }
    });
  }, [club.id, validForDate]);

  const preview = useMemo(
    () =>
      buildAvailabilityPreview({
        clubName: club.name,
        ymd: validForDate,
        slots: selectedSlots,
        description,
        price: price ? Number(price) : null,
        currency,
      }),
    [club.name, currency, description, price, selectedSlots, validForDate],
  );

  function toggleSlot(slot: string) {
    setSelectedSlots((current) =>
      current.includes(slot)
        ? current.filter((value) => value !== slot)
        : [...current, slot].sort(),
    );
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setRemoveImage(false);
    setImagePreview(URL.createObjectURL(file));
  }

  function handlePublish() {
    setError(null);
    setSuccess(null);

    if (selectedSlots.length === 0) {
      setError("Select at least one slot.");
      return;
    }

    const formData = new FormData();
    formData.set("validForDate", validForDate);
    formData.set("slots", JSON.stringify(selectedSlots));
    formData.set("description", description);
    formData.set("price", price);
    formData.set("currency", currency);
    formData.set("removeImage", removeImage ? "true" : "false");
    if (imageFile) {
      formData.set("image", imageFile);
    }

    startTransition(async () => {
      const result = await publishClubAvailabilityPost(club.id, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(existingPost ? "Post updated." : "Post published.");

      const reload = await loadAvailabilityComposerData(club.id, validForDate);
      if (reload.ok) {
        setFreeSlots(reload.data.freeSlots);
        setExistingPost(reload.data.existingPost);
        setRecentPosts(reload.data.recentPosts);
      }

      router.refresh();
    });
  }

  function handleArchive() {
    if (!existingPost) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await archiveClubAvailabilityPost(club.id, existingPost.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Post unpublished.");
      setExistingPost(null);
      setSelectedSlots([]);

      const reload = await loadAvailabilityComposerData(club.id, validForDate);
      if (reload.ok) {
        setRecentPosts(reload.data.recentPosts);
      }

      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-brand sm:text-3xl">
          Promote availability
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Publish free court slots to the player feed. Players will see this as a
          normal post and can book in the app.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold tracking-wider text-muted uppercase">
                Date
              </span>
              <input
                type="date"
                value={validForDate}
                min={todayYmd}
                max={maxYmd}
                onChange={(event) => setValidForDate(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand-soft sm:max-w-xs"
              />
            </label>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                  Available slots
                </p>
                {loading ? (
                  <span className="text-xs text-muted">Loading…</span>
                ) : null}
              </div>

              {freeSlots.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {freeSlots.map((slot) => {
                    const selected = selectedSlots.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleSlot(slot)}
                        className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                          selected
                            ? "bg-brand text-white"
                            : "border border-border bg-field text-foreground hover:border-brand-soft"
                        }`}
                      >
                        {formatSlotLabelFr(slot)}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl bg-field px-4 py-6 text-sm text-muted">
                  Aucun créneau disponible pour cette date.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-panel p-6 shadow-sm">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-[11px] font-semibold tracking-wider text-muted uppercase">
                  Status message (optional)
                </span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  placeholder="e.g. Les terrains sont praticables"
                  className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand-soft"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold tracking-wider text-muted uppercase">
                  Price (optional)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="120"
                  className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand-soft"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold tracking-wider text-muted uppercase">
                  Currency
                </span>
                <input
                  type="text"
                  value={currency}
                  maxLength={3}
                  onChange={(event) =>
                    setCurrency(event.target.value.toUpperCase())
                  }
                  className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-foreground uppercase outline-none transition focus:border-brand-soft"
                />
              </label>

              <div className="sm:col-span-2">
                <span className="mb-2 block text-[11px] font-semibold tracking-wider text-muted uppercase">
                  Promo image (optional)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-field file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand"
                />
                {imagePreview ? (
                  <div className="mt-4 flex items-start gap-3">
                    <div className="h-24 w-40 overflow-hidden rounded-xl border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Promo preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        setRemoveImage(true);
                      }}
                      className="text-sm font-semibold text-red-600 hover:text-red-700"
                    >
                      Remove image
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm font-medium text-brand-soft">{success}</p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePublish}
              disabled={pending || loading || freeSlots.length === 0}
              className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:opacity-60"
            >
              {pending ? "Publishing…" : existingPost ? "Update post" : "Publish"}
            </button>
            {existingPost?.status === "active" ? (
              <button
                type="button"
                onClick={handleArchive}
                disabled={pending}
                className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
              >
                Unpublish
              </button>
            ) : null}
          </div>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
            <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
              Preview
            </p>
            <pre className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {preview}
            </pre>
          </section>

          <section className="rounded-2xl border border-border bg-panel p-5 shadow-sm">
            <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
              Recent posts
            </p>
            {recentPosts.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {recentPosts.map((post) => (
                  <RecentPostItem
                    key={post.id}
                    post={post}
                    onSelectDate={setValidForDate}
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted">No posts yet.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function RecentPostItem({
  post,
  onSelectDate,
}: {
  post: AvailabilityPost;
  onSelectDate: (ymd: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelectDate(post.validForDate)}
        className="w-full rounded-xl border border-border bg-field px-3 py-3 text-left transition hover:border-brand-soft"
      >
        <p className="text-sm font-semibold text-foreground">{post.title}</p>
        <p className="mt-1 text-xs text-muted">
          {post.validForDate} · {post.availabilitySlots.length} slot
          {post.availabilitySlots.length !== 1 ? "s" : ""} · {post.status}
        </p>
      </button>
    </li>
  );
}
