/**
 * Format milliseconds as a human-readable duration string.
 * @param {number|null} ms
 * @returns {string}
 */
export function fmt(ms) {
  if (ms == null) return "\u2014";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

/**
 * Format a date string as a relative time ago string.
 * @param {string|null} dateStr
 * @returns {string}
 */
export function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`;
}

/**
 * Format a date string as a localized date/time.
 * @param {string|null} dateStr
 * @returns {string}
 */
export function formatTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Format a date string as a localized date/time with year.
 * @param {string|null} dateStr
 * @returns {string}
 */
export function formatTimeLong(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Return a CSS class for a HTTP status code.
 * @param {number} code
 * @returns {string}
 */
export function statusCodeClass(code) {
  return code >= 500 ? "s5xx" : code >= 400 ? "s4xx" : "s2xx";
}

/**
 * Return a color string for an HTTP method.
 * @param {string} method
 * @returns {string}
 */
export function methodColor(method) {
  if (method === "GET") return "#16a34a";
  if (method === "POST") return "#2563eb";
  if (method === "PATCH" || method === "PUT") return "#d97706";
  if (method === "DELETE") return "#dc2626";
  return "#6b7280";
}
