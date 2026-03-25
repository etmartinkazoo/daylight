/**
 * Simple markdown to HTML converter.
 * Handles: headings, bold, italic, code blocks, inline code, links,
 * unordered/ordered lists, blockquotes, horizontal rules, tables, and paragraphs.
 */
export function markdownToHtml(text) {
  if (!text) return "";

  // Extract code blocks first (before HTML escaping) to preserve their content
  const codeBlocks = [];
  let processed = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push({ lang, code: code.trim() });
    return `\x00CODEBLOCK_${idx}\x00`;
  });

  // Escape HTML
  processed = processed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Process line-by-line for block elements
  const lines = processed.split("\n");
  const result = [];
  let inList = null; // "ul" or "ol"
  let inBlockquote = false;
  let inTable = false;
  let tableRows = [];

  function closeList() {
    if (inList) { result.push(`</${inList}>`); inList = null; }
  }
  function closeBlockquote() {
    if (inBlockquote) { result.push("</blockquote>"); inBlockquote = false; }
  }
  function closeTable() {
    if (inTable && tableRows.length > 0) {
      let t = '<table class="md-table"><thead><tr>';
      const headers = tableRows[0];
      headers.forEach(h => { t += `<th>${inlineFormat(h.trim())}</th>`; });
      t += "</tr></thead><tbody>";
      for (let i = 2; i < tableRows.length; i++) {
        t += "<tr>";
        tableRows[i].forEach(c => { t += `<td>${inlineFormat(c.trim())}</td>`; });
        t += "</tr>";
      }
      t += "</tbody></table>";
      result.push(t);
      tableRows = [];
      inTable = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block placeholder — output as-is
    const codeMatch = line.match(/\x00CODEBLOCK_(\d+)\x00/);
    if (codeMatch) {
      closeList(); closeBlockquote(); closeTable();
      const block = codeBlocks[parseInt(codeMatch[1])];
      const escaped = block.code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const langLabel = block.lang ? `<span class="code-lang">${block.lang}</span>` : "";
      const copyBtn = `<button class="code-copy" onclick="(function(btn){var t=btn.closest('.code-block').querySelector('code').textContent;navigator.clipboard.writeText(t);btn.textContent='Copied!';setTimeout(function(){btn.textContent='Copy'},2000)})(this)">Copy</button>`;
      result.push(`<div class="code-block"><div class="code-header">${langLabel}${copyBtn}</div><pre class="md-pre"><code>${escaped}</code></pre></div>`);
      continue;
    }

    // Table rows
    if (line.includes("|") && line.trim().startsWith("|")) {
      closeList(); closeBlockquote();
      const cells = line.split("|").slice(1, -1);
      if (cells.length > 0) {
        if (cells.every(c => /^[\s\-:]+$/.test(c))) {
          if (!inTable) inTable = true;
          tableRows.push(cells);
          continue;
        }
        if (!inTable) inTable = true;
        tableRows.push(cells);
        continue;
      }
    } else if (inTable) {
      closeTable();
    }

    // Horizontal rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      closeList(); closeBlockquote(); closeTable();
      result.push('<hr class="md-hr">');
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeList(); closeBlockquote(); closeTable();
      const level = headingMatch[1].length;
      result.push(`<h${level} class="md-h${level}">${inlineFormat(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Blockquote
    if (line.startsWith("&gt; ") || line === "&gt;") {
      closeList(); closeTable();
      if (!inBlockquote) { result.push('<blockquote class="md-blockquote">'); inBlockquote = true; }
      result.push(inlineFormat(line.replace(/^&gt;\s?/, "")));
      continue;
    } else if (inBlockquote) {
      closeBlockquote();
    }

    // Unordered list
    if (/^[\s]*[-*+]\s/.test(line)) {
      closeBlockquote(); closeTable();
      if (inList !== "ul") { closeList(); result.push('<ul class="md-ul">'); inList = "ul"; }
      const content = line.replace(/^[\s]*[-*+]\s/, "");
      if (content.startsWith("[ ] ")) {
        result.push(`<li class="md-li"><input type="checkbox" disabled /> ${inlineFormat(content.slice(4))}</li>`);
      } else if (content.startsWith("[x] ") || content.startsWith("[X] ")) {
        result.push(`<li class="md-li"><input type="checkbox" checked disabled /> ${inlineFormat(content.slice(4))}</li>`);
      } else {
        result.push(`<li class="md-li">${inlineFormat(content)}</li>`);
      }
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^[\s]*(\d+)\.\s(.+)$/);
    if (olMatch) {
      closeBlockquote(); closeTable();
      if (inList !== "ol") { closeList(); result.push('<ol class="md-ol">'); inList = "ol"; }
      result.push(`<li class="md-li">${inlineFormat(olMatch[2])}</li>`);
      continue;
    }

    // Close list if we hit a non-list line
    if (inList && line.trim() !== "") {
      closeList();
    }

    // Empty line
    if (line.trim() === "") {
      if (inList) continue;
      result.push("");
      continue;
    }

    // Regular paragraph
    closeTable();
    result.push(`<p class="md-p">${inlineFormat(line)}</p>`);
  }

  closeList();
  closeBlockquote();
  closeTable();

  return result.join("\n");
}

/** Inline formatting: bold, italic, code, links, strikethrough */
function inlineFormat(text) {
  if (!text) return "";
  return text
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');
}
