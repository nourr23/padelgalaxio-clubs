"use server";

import { revalidatePath } from "next/cache";

import { assertClubsAppAccess } from "@/lib/auth/assert-clubs-access";
import { createClient } from "@/lib/supabase/server";
import {
  archiveAvailabilityPost,
  fetchAvailabilityPostForDate,
  fetchFreeSlotsForDate,
  fetchMyClub,
  fetchRecentAvailabilityPosts,
  publishAvailabilityPost,
  type AvailabilityPost,
} from "@/src/features/availability-posts/api";
import { buildAvailabilityTitle } from "@/src/features/availability-posts/format";
import {
  isValidSlotTime,
  maxSelectableDateYmd,
  parseYmdToLocalDate,
  startOfLocalDay,
} from "@/src/features/availability-posts/slots";
import { publishAvailabilitySchema } from "@/src/features/availability-posts/validation";
import {
  removePostImages,
  uploadPostImage,
} from "@/src/features/availability-posts/upload";
import type { Club } from "@/src/types/database";

type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

export type AvailabilityComposerData = {
  validForDate: string;
  freeSlots: string[];
  existingPost: AvailabilityPost | null;
  recentPosts: AvailabilityPost[];
};

async function assertClubOwnerForClub(clubId: string) {
  const supabase = await createClient();
  const access = await assertClubsAppAccess(supabase);
  if (!access.ok) {
    return { ok: false as const, error: "You must be signed in." };
  }

  const club =
    access.club ??
    (await fetchMyClub(supabase, access.user.id));

  if (!club || club.id !== clubId) {
    return { ok: false as const, error: "You can only manage your own club." };
  }

  return {
    ok: true as const,
    supabase,
    club,
    userId: access.user.id,
  };
}

function validateDateRange(ymd: string) {
  const date = parseYmdToLocalDate(ymd);
  if (!date) return "Invalid date.";
  if (date < startOfLocalDay()) return "Date cannot be in the past.";
  if (ymd > maxSelectableDateYmd()) return "Date is too far in the future.";
  return null;
}

export async function loadAvailabilityComposerData(
  clubId: string,
  validForDate: string,
): Promise<ActionResult<AvailabilityComposerData>> {
  const auth = await assertClubOwnerForClub(clubId);
  if (!auth.ok) return auth;

  const dateError = validateDateRange(validForDate);
  if (dateError) return { ok: false, error: dateError };

  try {
    const [freeSlots, existingPost, recentPosts] = await Promise.all([
      fetchFreeSlotsForDate(auth.supabase, auth.club, validForDate),
      fetchAvailabilityPostForDate(auth.supabase, clubId, validForDate),
      fetchRecentAvailabilityPosts(auth.supabase, clubId),
    ]);

    return {
      ok: true,
      data: { validForDate, freeSlots, existingPost, recentPosts },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to load availability data.",
    };
  }
}

export async function publishClubAvailabilityPost(
  clubId: string,
  formData: FormData,
): Promise<ActionResult<{ postId: string }>> {
  const auth = await assertClubOwnerForClub(clubId);
  if (!auth.ok) return auth;

  const rawSlots = formData.get("slots");
  let slots: string[] = [];
  try {
    slots = JSON.parse(String(rawSlots ?? "[]")) as string[];
  } catch {
    return { ok: false, error: "Invalid slot selection." };
  }

  const priceRaw = String(formData.get("price") ?? "").trim();
  const parsed = publishAvailabilitySchema.safeParse({
    validForDate: String(formData.get("validForDate") ?? ""),
    slots,
    description: String(formData.get("description") ?? "") || null,
    price: priceRaw ? Number(priceRaw) : null,
    currency: String(formData.get("currency") ?? "TND") || "TND",
    removeImage: formData.get("removeImage") === "true",
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid form data.";
    return { ok: false, error: message };
  }

  const dateError = validateDateRange(parsed.data.validForDate);
  if (dateError) return { ok: false, error: dateError };

  for (const slot of parsed.data.slots) {
    if (!isValidSlotTime(slot, auth.club)) {
      return { ok: false, error: `Invalid slot time: ${slot}` };
    }
  }

  const freeSlots = await fetchFreeSlotsForDate(
    auth.supabase,
    auth.club,
    parsed.data.validForDate,
  );
  const freeSet = new Set(freeSlots);

  for (const slot of parsed.data.slots) {
    if (!freeSet.has(slot)) {
      return { ok: false, error: `Slot ${slot} is no longer available.` };
    }
  }

  try {
    const title = buildAvailabilityTitle(parsed.data.validForDate);
    const { postId } = await publishAvailabilityPost(auth.supabase, {
      clubId,
      userId: auth.userId,
      validForDate: parsed.data.validForDate,
      slots: parsed.data.slots,
      description: parsed.data.description,
      price: parsed.data.price,
      currency: parsed.data.currency,
      title,
    });

    const imageFile = formData.get("image");
    const shouldRemoveImage = parsed.data.removeImage === true;

    if (shouldRemoveImage) {
      await removePostImages(auth.supabase, postId);
    }

    if (imageFile instanceof File && imageFile.size > 0) {
      await removePostImages(auth.supabase, postId);
      const uploaded = await uploadPostImage(
        auth.supabase,
        auth.userId,
        postId,
        imageFile,
      );

      const { error: imageError } = await auth.supabase
        .from("post_images" as never)
        .insert({
          post_id: postId,
          storage_path: uploaded.storagePath,
          public_url: uploaded.publicUrl,
          sort_order: 0,
          is_primary: true,
        } as never);

      if (imageError) throw imageError;
    }

    revalidatePath("/dashboard/promote");
    return { ok: true, data: { postId } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to publish post.",
    };
  }
}

export async function archiveClubAvailabilityPost(
  clubId: string,
  postId: string,
): Promise<ActionResult> {
  const auth = await assertClubOwnerForClub(clubId);
  if (!auth.ok) return auth;

  try {
    await archiveAvailabilityPost(auth.supabase, postId, auth.userId);
    revalidatePath("/dashboard/promote");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to unpublish post.",
    };
  }
}

export async function fetchClubForUser(): Promise<ActionResult<{ club: Club }>> {
  const supabase = await createClient();
  const access = await assertClubsAppAccess(supabase);
  if (!access.ok) return { ok: false, error: "You must be signed in." };

  const club =
    access.club ?? (await fetchMyClub(supabase, access.user.id));

  if (!club) {
    return { ok: false, error: "No club linked to this account." };
  }

  return { ok: true, data: { club } };
}
