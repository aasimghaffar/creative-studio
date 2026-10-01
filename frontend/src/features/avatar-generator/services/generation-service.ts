import { delay, makeBatch, type GeneratedItem } from "@/features/studio-kit";
import type { AvatarSettings } from "../types";

/**
 * Mock generation service — swap for a real inference API by reimplementing
 * this one function; the UI stays untouched.
 */
export async function generateAvatars(settings: AvatarSettings): Promise<GeneratedItem[]> {
  await delay(1500);
  return makeBatch(settings, "FACE");
}
