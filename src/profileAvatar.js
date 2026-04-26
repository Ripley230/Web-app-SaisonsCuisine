import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "./supaCore";

export const AVATARS_BUCKET = "avatars";

const publicMarker = () => `/storage/v1/object/public/${AVATARS_BUCKET}/`;

export function extractAvatarPathFromPublicUrl(publicUrl) {
  if (!publicUrl || typeof publicUrl !== "string") return null;
  const marker = publicMarker();
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length);
}

export async function uploadProfileAvatar(userId, localUri) {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const filePath = `${userId}/avatar.jpg`;
  const content = decode(base64);
  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(filePath, content, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export async function deleteProfileAvatarFile(publicUrl) {
  const path = extractAvatarPathFromPublicUrl(publicUrl);
  if (!path) return;
  const { error } = await supabase.storage.from(AVATARS_BUCKET).remove([path]);
  if (error) throw error;
}
