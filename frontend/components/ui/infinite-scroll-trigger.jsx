import { useEffect, useRef } from "react";

export default function InfiniteScrollTrigger({ loading, hasMore, onLoadMore }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) onLoadMore();
      },
      { threshold: 0.1 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  if (!hasMore) return null;
  return (
    <div ref={ref} style={{ padding: "1rem", textAlign: "center", fontSize: "0.8125rem", color: "var(--color-muted)" }}>
      {loading ? "Loading..." : ""}
    </div>
  );
}
