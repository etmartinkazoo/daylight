import { useState } from "react";

const TOOL_LABELS = {
  query: "Search",
  details: "Lookup",
  project_summary: "Project Summary",
  milestone_todos: "Milestone Todos",
  find_similar_todos: "Find Similar",
  project_reorg: "Reorganize",
  github_search: "Code Search",
  github_read_file: "Read File",
  browse_url: "Browse URL",
};

export default function ToolCard({ tool = "", message = "", arguments: args, status = "running", result = "" }) {
  const [expanded, setExpanded] = useState(false);
  const toolLabel = TOOL_LABELS[tool] || tool;
  const toolIcon = status === "running" ? "running" : status === "error" ? "error" : "done";

  return (
    <button
      className={`tool-card${status === "done" ? " done" : ""}${status === "error" ? " error" : ""}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="tool-header">
        <span className="tool-icon">
          {toolIcon === "running" && (
            <svg className="tool-spinner-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="8" cy="8" r="6" strokeDasharray="28 10" />
            </svg>
          )}
          {toolIcon === "error" && (
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M6 6l4 4M10 6l-4 4"/></svg>
          )}
          {toolIcon === "done" && (
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M5.5 8.5l2 2 3.5-4"/></svg>
          )}
        </span>
        <span className="tool-name">{toolLabel}</span>
        <span className="tool-desc">{message}</span>
        {result && status !== "running" && <span className="tool-result">{result}</span>}
        <svg className={`tool-chevron${expanded ? " open" : ""}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 4.5L6 7.5L9 4.5"/>
        </svg>
      </div>
      {expanded && args && (
        <div className="tool-details">
          {Object.entries(args).map(([key, val]) => (
            <div key={key} className="tool-arg">
              <span className="tool-arg-key">{key}</span>
              <span className="tool-arg-val">{typeof val === "object" ? JSON.stringify(val) : val}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}
