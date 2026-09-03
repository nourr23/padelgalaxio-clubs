import type { SupabaseClient } from "@supabase/supabase-js";

export const POST_IMAGES_BUCKET = "post-images";

export async function uploadPostImage(
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  file: File,
): Promise<{ storagePath: string; publicUrl: string }> {
  const imageId = crypto.randomUUID();
  const path = `${userId}/${postId}/${imageId}.jpg`;

  const bytes = await file.arrayBuffer();
  const contentType = file.type.startsWith("image/") ? file.type : "image/jpeg";

  const { error: uploadError } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .upload(path, bytes, {
      upsert: false,
      contentType,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(POST_IMAGES_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error("Failed to get public URL for uploaded image");
  }

  return { storagePath: path, publicUrl: data.publicUrl };
}

export async function removePostImages(
  supabase: SupabaseClient,
  postId: string,
): Promise<void> {
  const { data: images, error } = await supabase
    .from("post_images" as never)
    .select("storage_path")
    .eq("post_id", postId);

  if (error) throw error;

  const paths = ((images ?? []) as { storage_path: string | null }[])
    .map((row) => row.storage_path)
    .filter((path): path is string => Boolean(path));

  if (paths.length > 0) {
    await supabase.storage.from(POST_IMAGES_BUCKET).remove(paths);
  }

  const { error: deleteError } = await supabase
    .from("post_images" as never)
    .delete()
    .eq("post_id", postId);

  if (deleteError) throw deleteError;
}
