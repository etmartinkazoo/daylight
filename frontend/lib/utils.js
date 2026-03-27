import { router } from "@inertiajs/svelte";

/**
 * Navigate to a path with params, preserving Inertia state.
 * Strips undefined/empty-string values from params.
 */
export function navigate(path, params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
  );
  router.get(path, cleaned, { preserveState: true });
}

/**
 * Toggle an item in a selection array. Returns a new array.
 */
export function toggleSelect(selectedIds, id) {
  return selectedIds.includes(id)
    ? selectedIds.filter((i) => i !== id)
    : [...selectedIds, id];
}

/**
 * Return all IDs from an array of objects.
 */
export function selectAllIds(items) {
  return items.map((item) => item.id);
}
