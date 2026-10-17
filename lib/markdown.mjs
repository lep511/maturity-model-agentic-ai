// Markdown helpers shared by the MCP server. extractMarkdownSection() must stay
// identical to the copy in js/app.js (a classic browser script that cannot
// import modules); both return the heading plus its body up to the next heading
// of the same or a higher level.

export function extractMarkdownSection(markdown, title) {
  const lines = String(markdown || '').split('\n');
  const start = lines.findIndex(l => new RegExp(`^#{1,6}\\s+${title}\\s*$`, 'i').test(l.trim()));
  if (start < 0) return null;
  const level = lines[start].trim().match(/^#+/)[0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const m = lines[i].trim().match(/^(#{1,6})\s+\S/);
    if (m && m[1].length <= level) { end = i; break; }
  }
  return lines.slice(start, end).join('\n').trim();
}
