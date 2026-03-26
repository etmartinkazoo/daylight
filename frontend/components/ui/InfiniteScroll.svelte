<script>
  /**
   * Infinite scroll sentinel — place at the bottom of a list.
   * When visible, calls `onLoadMore` to fetch the next page.
   *
   * @type {{ loading?: boolean, hasMore?: boolean, onLoadMore?: () => void }}
   */
  let { loading = false, hasMore = true, onLoadMore } = $props();

  let sentinel = $state(null);

  $effect(() => {
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          onLoadMore?.();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  });
</script>

{#if hasMore}
  <div class="infinite-sentinel" bind:this={sentinel}>
    {#if loading}
      <div class="infinite-loading">
        <span class="infinite-spinner"></span>
        <span class="infinite-text">Loading more...</span>
      </div>
    {/if}
  </div>
{/if}

<style>
  .infinite-sentinel {
    height: 1px;
    width: 100%;
  }

  .infinite-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
  }

  .infinite-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid #e2e8f0;
    border-top-color: #0f172a;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .infinite-text {
    font-size: 0.75rem;
    color: #64748b;
  }
</style>
