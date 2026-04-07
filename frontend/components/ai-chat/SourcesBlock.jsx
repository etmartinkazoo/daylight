import { useState } from "react";

export default function SourcesBlock({ sources = [] }) {
  const [expanded, setExpanded] = useState(false);
  if (sources.length === 0) return null;

  return (
    <div className="sources">
      <button className="sources-trigger" onClick={() => setExpanded(!expanded)}>
        <svg className="sources-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 4h12M2 8h8M2 12h10"/>
        </svg>
        <span>Used {sources.length} source{sources.length !== 1 ? "s" : ""}</span>
        <svg className={`sources-chevron${expanded ? " open" : ""}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 4.5L6 7.5L9 4.5"/>
        </svg>
      </button>
      <div className={`sources-collapse${expanded ? " open" : ""}`}>
        <div className="sources-collapse-inner">
          <div className="sources-list">
            {sources.map((source, i) => {
              const inner = (
                <>
                  <span className="source-badge" style={{ "--source-color": source.color || "var(--color-muted)" }}>
                    {source.icon || source.type?.charAt(0) || "?"}
                  </span>
                  <div className="source-info">
                    <span className="source-title">{source.title}</span>
                    {source.detail && <span className="source-detail">{source.detail}</span>}
                  </div>
                </>
              );
              return source.url ? (
                <a key={i} href={source.url} className="source-item" target="_blank" rel="noopener noreferrer">{inner}</a>
              ) : (
                <div key={i} className="source-item">{inner}</div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
