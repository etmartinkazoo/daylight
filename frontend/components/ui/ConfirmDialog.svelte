<script>
/**
 * Reusable confirmation dialog.
 *
 * Two usage modes:
 *
 * 1. Async (for onclick handlers):
 *    if (await confirmRef.show("Delete?", { variant: "danger" })) {
 *      router.delete(path);
 *    }
 *
 * 2. With onConfirm callback (for delete buttons):
 *    confirmRef.show("Delete this item?", {
 *      variant: "danger",
 *      confirmLabel: "Delete",
 *      onConfirm: () => router.delete(path)
 *    })
 */
import Button from "./Button.svelte";

let open = $state(false);
let message = $state("");
let title = $state("Confirm");
let confirmLabel = $state("Confirm");
let cancelLabel = $state("Cancel");
let variant = $state("default");
let resolver = $state(null);
let onConfirmFn = $state(null);

export function show(msg, opts = {}) {
  message = msg;
  title = opts.title || "Confirm";
  confirmLabel = opts.confirmLabel || "Confirm";
  cancelLabel = opts.cancelLabel || "Cancel";
  variant = opts.variant || "default";
  onConfirmFn = opts.onConfirm || null;
  resolver = null;
  open = true;

  if (!onConfirmFn) {
    return new Promise((resolve) => {
      resolver = resolve;
    });
  }
}

function handleConfirm() {
  open = false;
  if (onConfirmFn) {
    onConfirmFn();
    onConfirmFn = null;
  } else if (resolver) {
    resolver(true);
    resolver = null;
  }
}

function handleCancel() {
  open = false;
  if (resolver) {
    resolver(false);
    resolver = null;
  }
  onConfirmFn = null;
}

function handleKeydown(e) {
  if (!open) return;
  if (e.key === "Escape") handleCancel();
  if (e.key === "Enter") handleConfirm();
}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="cd-overlay" onclick={handleCancel}>
    <div class="cd-dialog" onclick={(e) => e.stopPropagation()}>
      <h3 class="cd-title">{title}</h3>
      <p class="cd-message">{message}</p>
      <div class="cd-actions">
        <Button variant="outline" onclick={handleCancel}>{cancelLabel}</Button>
        <Button variant={variant === "danger" ? "danger" : "default"} onclick={handleConfirm}>{confirmLabel}</Button>
      </div>
    </div>
  </div>
{/if}

<style>
  .cd-overlay {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal, 1000);
    background: var(--color-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .cd-dialog {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 1.5rem;
    max-width: 24rem;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  }

  .cd-title { font-size: 1rem; font-weight: 600; }
  .cd-message { font-size: 0.875rem; color: var(--color-muted); line-height: 1.5; margin: 0; }
  .cd-actions { display: flex; justify-content: flex-end; gap: 0.5rem; padding-top: 0.5rem; }
</style>
