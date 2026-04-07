import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { router } from "@inertiajs/react";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function navigate(path, params = {}) {
  const cleanedParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== "")
  );
  router.get(path, cleanedParams, { preserveState: true, replace: true });
}

export function toggleSelect(selectedIds, id) {
  if (selectedIds.includes(id)) {
    return selectedIds.filter((i) => i !== id);
  }
  return [...selectedIds, id];
}

export function selectAllIds(items) {
  return items.map((item) => item.id);
}
