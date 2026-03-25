import { markdownToHtml } from "@/lib/markdown";

export function typeIcon(type) {
  switch (type) {
    case "Partner": return "P";
    case "Project": return "Pj";
    case "Service": return "Sv";
    case "Todo": return "T";
    case "Doc": return "D";
    case "File": return "F";
    case "Dir": return "/";
    case "Milestone": return "M";
    case "Group": return "G";
    case "Repo": return "R";
    default: return "@";
  }
}

export function typeColor(type) {
  switch (type) {
    case "Partner": return "var(--color-info)";
    case "Project": return "var(--color-purple)";
    case "Service": return "var(--color-success)";
    case "Todo": return "var(--color-warning)";
    case "Doc": return "var(--color-primary)";
    case "Milestone": return "var(--color-purple)";
    case "Group": return "var(--color-success)";
    case "File": return "var(--color-muted)";
    case "Dir": return "var(--color-muted)";
    default: return "var(--color-muted)";
  }
}

export function formatContent(text) {
  if (!text) return "";
  let html = markdownToHtml(text);
  html = html.replace(
    /(Todo|Partner|Project|Service|Milestone|Note|Doc|User)\s*#(\d+)/gi,
    (match, type, id) => {
      const t = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
      return `<button class="ai-record-link" data-type="${t}" data-id="${id}">${match}</button>`;
    },
  );
  return html;
}

/**
 * Detect artifact-worthy blocks in AI content:
 * - Named code files: "**filename.rb**" followed by a code block
 * - ```artifact blocks with metadata
 */
export function extractArtifacts(content) {
  if (!content) return { text: content, artifacts: [] };
  const artifacts = [];
  let cleaned = content;

  // Match ```artifact blocks: ```artifact title="..." type="..." \n content \n ```
  cleaned = cleaned.replace(/```artifact\s*(.*?)\n([\s\S]*?)```/g, (full, meta, body) => {
    const titleMatch = meta.match(/title="([^"]+)"/);
    const typeMatch = meta.match(/type="([^"]+)"/);
    artifacts.push({
      title: titleMatch?.[1] || "Artifact",
      type: typeMatch?.[1] || "document",
      content: body.trim(),
      format: "markdown",
    });
    return "";
  });

  // Match named code files: **path/to/file.ext** followed by ```lang
  cleaned = cleaned.replace(/\*\*([a-zA-Z0-9_\-/.]+\.\w{1,10})\*\*\s*\n```(\w*)\n([\s\S]*?)```/g, (full, filename, lang, code) => {
    artifacts.push({
      title: filename,
      type: "code",
      content: code.trim(),
      format: "code",
      lang: lang || filename.split(".").pop(),
    });
    return "";
  });

  return { text: cleaned.trim(), artifacts };
}

export function parseActions(content) {
  if (!content) return { text: content, actions: [] };
  const actions = [];
  const regex = /```action\s*\n?([\s\S]*?)```/g;
  let match;
  let cleanedContent = content;

  while ((match = regex.exec(content)) !== null) {
    const raw = match[1].trim();
    const jsonMatch = raw.match(/\{[^{}]*"type"\s*:\s*"[^"]+?"[^{}]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.type) {
          actions.push(parsed);
          cleanedContent = cleanedContent.replace(match[0], "");
        }
      } catch {}
    }
  }

  if (actions.length === 0) {
    const lines = content.split("\n");
    let inAction = false;
    let actionJson = "";
    for (const line of lines) {
      if (line.trim().startsWith("```action")) {
        inAction = true;
        actionJson = "";
        continue;
      }
      if (inAction && line.trim() === "```") {
        inAction = false;
        const jsonMatch = actionJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.type) {
              actions.push(parsed);
              cleanedContent = cleanedContent.replace("```action\n" + actionJson + "```", "");
            }
          } catch {}
        }
        continue;
      }
      if (inAction) {
        actionJson += line + "\n";
      }
    }
  }

  return { text: cleanedContent.trim(), actions };
}

export function actionLabel(action) {
  switch (action.type) {
    case "update_todo": return `Update todo #${action.id}`;
    case "create_todo": return `Create todo "${action.name}"`;
    case "complete_todo": return `Complete todo #${action.id}`;
    case "assign_todo": return `Assign todo #${action.id}`;
    case "create_note": return `Add note to todo #${action.todo_id}`;
    case "log_time": return `Log ${action.minutes}m on todo #${action.todo_id}`;
    default: return action.type;
  }
}

const TYPE_URLS = {
  Todo: (id) => `/todos/${id}/edit`,
  Partner: (id) => `/partners/${id}/edit`,
  Project: (id) => `/projects/${id}/edit`,
  Service: (id) => `/services/${id}/edit`,
  Milestone: (id) => `/milestones/${id}`,
  Doc: (id) => `/docs/${id}`,
  User: (id) => `/users/${id}`,
};

export function extractSources(content, toolCalls) {
  const sources = [];
  const seen = new Set();

  // Extract record references from content (e.g., "Todo #123")
  if (content) {
    const regex = /(Todo|Partner|Project|Service|Milestone|Note|Doc|User)\s*#(\d+)/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const type = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      const id = match[2];
      const key = `${type}:${id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const urlFn = TYPE_URLS[type];
      sources.push({
        type,
        title: `${type} #${id}`,
        icon: typeIcon(type),
        color: typeColor(type),
        url: urlFn ? urlFn(id) : null,
      });
    }
  }

  // Extract sources from tool calls
  if (toolCalls) {
    for (const tc of toolCalls) {
      if (tc.tool === "query" && tc.arguments?.model) {
        const key = `tool:query:${tc.arguments.model}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const type = tc.arguments.model.charAt(0).toUpperCase() + tc.arguments.model.slice(1);
        sources.push({
          type: "search",
          title: `Searched ${type}s`,
          detail: tc.result || tc.message,
          icon: "Q",
          color: "var(--color-primary)",
        });
      } else if (tc.tool === "details" && tc.arguments?.type) {
        const type = tc.arguments.type.charAt(0).toUpperCase() + tc.arguments.type.slice(1);
        const id = tc.arguments.id;
        const key = `${type}:${id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const urlFn = TYPE_URLS[type];
        sources.push({
          type,
          title: `${type} #${id}`,
          icon: typeIcon(type),
          color: typeColor(type),
          url: urlFn ? urlFn(id) : null,
        });
      } else if (tc.tool === "project_summary" && tc.arguments?.project_id) {
        const key = `Project:${tc.arguments.project_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        sources.push({
          type: "Project",
          title: `Project #${tc.arguments.project_id}`,
          icon: "Pj",
          color: typeColor("Project"),
          url: `/projects/${tc.arguments.project_id}/edit`,
        });
      }
    }
  }

  return sources;
}

export function contextualSuggestions(content, toolCalls) {
  const suggestions = [];
  if (!content) return suggestions;

  // Detect what the AI talked about and suggest follow-ups
  if (/todo|task/i.test(content)) {
    suggestions.push("Show me overdue todos");
    if (/create|add/i.test(content)) suggestions.push("Assign it to someone");
  }
  if (/partner|client/i.test(content)) {
    suggestions.push("Show their open projects");
  }
  if (/project|milestone/i.test(content)) {
    suggestions.push("Break this down into tasks");
  }
  if (/summary|report|overview/i.test(content)) {
    suggestions.push("Export this as a note");
  }

  return suggestions.slice(0, 3);
}
