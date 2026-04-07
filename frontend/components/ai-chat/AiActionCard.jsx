import { actionLabel } from "./utils.js";

export default function AiActionCard({ action, executing = false, result = null, onExecute }) {
  return (
    <div className="ai-action-card">
      <div className="ai-action-info">
        <span className="ai-action-type">{action.type.replace(/_/g, " ")}</span>
        <span className="ai-action-label">{actionLabel(action)}</span>
      </div>
      {result ? (
        <span className={`ai-action-result${result.success ? " success" : " error"}`}>
          {result.success ? result.message : result.error}
        </span>
      ) : (
        <button className="ai-action-approve" disabled={executing} onClick={() => onExecute?.(action)}>
          {executing ? "Running..." : "Approve"}
        </button>
      )}
    </div>
  );
}
