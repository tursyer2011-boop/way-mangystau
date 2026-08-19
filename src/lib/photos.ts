import { supabase } from "@/integrations/supabase/client";

export const PHOTO_BUCKET = "listing-photos";

/** Uploads a file to storage and returns its storage path. */
export async function uploadPhoto(file: Blob, userId: string, ext = "jpg") {
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function signedPhotoUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 60 * 60 * 24);
  return data?.signedUrl ?? null;
}

export function base64ToBlob(base64: string, type = "image/jpeg") {
  const clean = base64.includes(",") ? base64.split(",")[1]! : base64;
  const bytes = atob(clean);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type });
}
