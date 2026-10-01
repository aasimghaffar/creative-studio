import { apiRequest } from "@/lib/api-client";

/** Profile module API — /api/v1/profile endpoints. */

export interface ApiProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  credits: number;
  created_at: string;
  company: string | null;
  country: string | null;
  timezone: string;
  language: string;
  phone: string | null;
  avatar_url: string | null;
}

export function fetchProfile(): Promise<ApiProfile> {
  return apiRequest<ApiProfile>("/v1/profile");
}

export function updateProfile(values: {
  name: string;
  email: string;
  company: string;
  country: string;
  timezone: string;
  language: string;
}): Promise<ApiProfile> {
  return apiRequest<ApiProfile>("/v1/profile", {
    method: "PUT",
    body: JSON.stringify(values),
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

export async function uploadProfilePhoto(file: File): Promise<string> {
  const image = await fileToBase64(file);
  const data = await apiRequest<{ avatar_url: string }>("/v1/profile/photo", {
    method: "POST",
    body: JSON.stringify({ image, mime: file.type }),
  });

  return data.avatar_url;
}

export function deleteProfilePhoto(): Promise<null> {
  return apiRequest<null>("/v1/profile/photo", { method: "DELETE" });
}
