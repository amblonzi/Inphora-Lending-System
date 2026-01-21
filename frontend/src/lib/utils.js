import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * UTILITY: cn (Class Name)
 * Combines standard class names with Tailwind's logic to handle conflicts efficiently.
 * Usage: className={cn("bg-red-500", isPrimary && "bg-blue-500 text-white")}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
