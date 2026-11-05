import React from "react";

/**
 * Parses inline markdown such as **bold** and *italic* into React nodes.
 */
export function renderMarkdownInline(text) {
  if (!text) return null;
  const parts = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
  let lastIndex = 0;
  let match;
  let keyIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const matchText = match[0];
    if (matchText.startsWith("**") && matchText.endsWith("**")) {
      parts.push(<strong key={`b-${keyIdx++}`}>{matchText.slice(2, -2)}</strong>);
    } else if (matchText.startsWith("*") && matchText.endsWith("*")) {
      parts.push(<em key={`i-${keyIdx++}`}>{matchText.slice(1, -1)}</em>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return parts.length > 0 ? parts : text;
}

/**
 * Parses markdown text into sections based on ## or ### headers.
 */
export function parseMarkdownSections(rawText) {
  if (!rawText) return [];

  // Fallback if no markdown hashes are used but split by ###
  if (!rawText.includes("##") && !rawText.includes("###")) {
    return [{ title: "Overview", body: rawText.trim() }];
  }

  const lines = rawText.split("\n");
  const sections = [];
  let currentTitle = "";
  let currentBodyLines = [];

  for (const line of lines) {
    const headerMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headerMatch) {
      if (currentTitle || currentBodyLines.length > 0) {
        sections.push({
          title: currentTitle || "Overview",
          body: currentBodyLines.join("\n").trim()
        });
        currentBodyLines = [];
      }
      currentTitle = headerMatch[1].replace(/\*\*/g, "").trim();
    } else {
      currentBodyLines.push(line);
    }
  }

  if (currentTitle || currentBodyLines.length > 0) {
    sections.push({
      title: currentTitle || "Overview",
      body: currentBodyLines.join("\n").trim()
    });
  }

  return sections;
}

/**
 * Renders body content cleanly: groups consecutive bullet lines into <ul>
 * while preserving narrative lines as <p>.
 */
export function renderMarkdownBody(body, isTimeline = false) {
  if (!body) return <p className="narrative-empty" style={{ color: "#6b7280", fontStyle: "italic" }}>No details recorded.</p>;
  const rawLines = body.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const elements = [];
  let currentBullets = [];
  let elKey = 0;

  const flushBullets = () => {
    if (currentBullets.length > 0) {
      elements.push(
        <ul key={`ul-${elKey++}`} className={isTimeline ? "timeline-bullet-list" : "clinical-bullet-list"} style={{ margin: "8px 0 12px 20px", padding: 0 }}>
          {currentBullets.map((item, idx) => (
            <li key={idx} style={{ marginBottom: "4px", lineHeight: "1.5" }}>
              {renderMarkdownInline(item)}
            </li>
          ))}
        </ul>
      );
      currentBullets = [];
    }
  };

  for (const line of rawLines) {
    const isBullet = line.startsWith("•") || line.startsWith("- ") || line.startsWith("* ");
    if (isBullet) {
      const clean = line.replace(/^[•\-\*]\s*/, "");
      currentBullets.push(clean);
    } else {
      flushBullets();
      elements.push(
        <p key={`p-${elKey++}`} className="clinical-narrative-p" style={{ margin: "6px 0", lineHeight: "1.6" }}>
          {renderMarkdownInline(line)}
        </p>
      );
    }
  }
  flushBullets();
  return elements;
}

