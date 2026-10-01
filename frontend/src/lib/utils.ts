import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes without conflicts. Used by every shadcn/ui component. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
