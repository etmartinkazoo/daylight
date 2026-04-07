import { useState } from "react";

const TYPE_MAP = {
  document: { icon: "D", label: "Document" },
  code: { icon: "<>", label: "Code" },
  plan: { icon: "P", label: "Plan" },
  note: { icon: "N", label: "Note" },
  table: { icon: "T", label: "Table" },
};

export default function ArtifactBlock({ title = "", description = "", type = "document", actions, children }) {
  const [expanded, setExpanded] = useState(true);
  const { icon: typeIcon, label: typeLabel } = TYPE_MAP[type] || { icon: "A", label: "Artifact" };

  return (
    <div className={`artifact${!expanded ? " collapsed" : ""}`}>
      <div className="artifact-header">
        <div className="artifact-title-area">
          <span className="artifact-badge">{typeIcon}</span>
          <div className="artifact-meta">
            <span className="artifact-title">{title || typeLabel}</span>
            {description && <span className="artifact-desc">{description}</span>}
          </div>
        </div>
        <div className="artifact-actions">
          {actions}
          <button className="artifact-toggle" onClick={() => setExpanded(!expanded)} title={expanded ? "Collapse" : "Expand"}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className={!expanded ? "rotated" : ""}>
              <path d="M4 6l4 4 4-4"/>
            </svg>
          </button>
        </div>
      </div>
      <div className={`artifact-collapse${expanded ? " open" : ""}`}>
        <div className="artifact-collapse-inner">
          <div className="artifact-content">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
