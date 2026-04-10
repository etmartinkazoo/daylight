import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
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
