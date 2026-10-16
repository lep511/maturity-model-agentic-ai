// ─── PRINT PREVIEW ────────────────────────────────────────────────────────────
// Depends on globals from js/app.js: PILLARS, PILLAR_ABBR, PILLAR_COLORS,
// FOCUS_AREAS, LENS, DATA, scores, comments, sessions, currentSessionId,
// faShort(), escapeHtml(), renderPillarChrome(), closeModal().

function openPrintPreview() {
  // Pillar checkboxes are rendered by renderPillarChrome(); make sure they exist
  if (!document.querySelector('.phase-chk') && typeof renderPillarChrome === 'function') renderPillarChrome();

  // Build focus-area checkboxes
  const capBox = document.getElementById('capCheckboxes');
  capBox.innerHTML = '';
  FOCUS_AREAS.forEach(fa => {
    const lbl = document.createElement('label');
    lbl.className = 'print-checkbox-row';
    lbl.title = `${fa.id}: ${fa.question}`;
    lbl.innerHTML = `<input type="checkbox" class="cap-chk" value="${escapeHtml(fa.id)}" checked onchange="refreshPreview()">
      <span class="print-checkbox-label" style="font-size:11px"><span style="font-family:'Roboto Mono',monospace;font-size:9px;color:var(--text-dim)">${faShort(fa.id)}</span> ${escapeHtml(fa.name)}</span>`;
    capBox.appendChild(lbl);
  });
  document.getElementById('printModal').classList.add('open');
  refreshPreview();
}

function closePrintModal() {
  document.getElementById('printModal').classList.remove('open');
}

function toggleAllPhases(state) {
  document.querySelectorAll('.phase-chk').forEach(c => { c.checked = state; });
  refreshPreview();
}

function toggleAllCaps(state) {
  document.querySelectorAll('.cap-chk').forEach(c => { c.checked = state; });
  refreshPreview();
}

function onFormatChange() {
  const isTable = document.querySelector('input[name="printFormat"]:checked').value === 'table';
  const rowHowto = document.getElementById('row-howto');
  const togHowto = document.getElementById('tog-howto');
  rowHowto.style.opacity = isTable ? '0.4' : '1';
  rowHowto.style.pointerEvents = isTable ? 'none' : '';
  if (isTable) togHowto.checked = false;
  refreshPreview();
}

function getPrintOptions() {
  const format   = document.querySelector('input[name="printFormat"]:checked').value;
  const items    = document.querySelector('input[name="printItems"]:checked').value;
  const color    = document.querySelector('input[name="printColor"]:checked').value;
  const phases   = [...document.querySelectorAll('.phase-chk:checked')].map(c => parseInt(c.value));
  const caps     = [...document.querySelectorAll('.cap-chk:checked')].map(c => c.value);
  const guidance = document.getElementById('tog-guidance').checked;
  const howto    = document.getElementById('tog-howto').checked;
  const cmts     = document.getElementById('tog-comments').checked;
  const risk     = document.getElementById('tog-risk') ? document.getElementById('tog-risk').checked : true;
  const service  = document.getElementById('tog-service').checked;
  const summary  = document.getElementById('tog-summary').checked;
  return { format, items, color, phases, caps, guidance, howto, cmts, risk, service, summary };
}

function getPrintData(opts) {
  return DATA.filter(d => {
    const pi = PILLARS.indexOf(d.pillar);
    if (!opts.phases.includes(pi)) return false;
    if (!opts.caps.includes(d.focus_area_id)) return false;
    const s = scores[d.id];
    const hasScore = s !== null && s !== undefined && s !== 'na';
    const isExcluded = s === 'na';
    if (opts.items === 'scored' && !hasScore) return false;
    if (opts.items === 'unscored' && hasScore && !isExcluded) return false;
    return true;
  });
}

function scoreChipHtml(id, bw) {
  const s = scores[id];
  if (bw) {
    if (s === null || s === undefined) return `<span class="print-score-chip" style="background:#eee;color:#555!important">Not assessed</span>`;
    if (s === 'na')  return `<span class="print-score-chip" style="background:#ddd;color:#444!important">Excluded</span>`;
    if (s === 1)     return `<span class="print-score-chip" style="background:#111;color:#fff!important">100% Aligned</span>`;
    if (s === 0.75)  return `<span class="print-score-chip" style="background:#444;color:#fff!important">75% Aligned</span>`;
    if (s === 0.5)   return `<span class="print-score-chip" style="background:#777;color:#fff!important">50% Aligned</span>`;
    if (s === 0.25)  return `<span class="print-score-chip" style="background:#aaa;color:#fff!important">25% Aligned</span>`;
    return `<span class="print-score-chip" style="background:#f0f0f0;color:#333!important;border:1px solid #ccc">0% Aligned</span>`;
  }
  if (s === null || s === undefined) return `<span class="print-score-chip chip-none">Not assessed</span>`;
  if (s === 'na') return `<span class="print-score-chip chip-na">Excluded</span>`;
  if (s === 1)    return `<span class="print-score-chip chip-100">100% Aligned</span>`;
  if (s === 0.75) return `<span class="print-score-chip chip-75">75% Aligned</span>`;
  if (s === 0.5)  return `<span class="print-score-chip chip-50">50% Aligned</span>`;
  if (s === 0.25) return `<span class="print-score-chip chip-25">25% Aligned</span>`;
  return `<span class="print-score-chip chip-0">0% Aligned</span>`;
}

function riskChipHtml(risk, bw) {
  if (!risk) return '';
  const cls = bw ? 'print-risk' : `print-risk print-risk-${String(risk).toLowerCase()}`;
  return `<span class="${cls}" title="Level of risk exposed if this best practice is not established">${escapeHtml(risk)} risk</span>`;
}

function buildSummaryGrid(data, accent) {
  const isScoredId = id => scores[id] !== null && scores[id] !== undefined && scores[id] !== 'na';
  const total    = data.length;
  const assessed = data.filter(d => isScoredId(d.id)).length;
  const aligned  = data.filter(d => scores[d.id] === 1).length;
  const partial  = data.filter(d => scores[d.id] > 0 && scores[d.id] < 1).length;
  const highOpen = data.filter(d => d.risk === 'High' && scores[d.id] !== 'na' && scores[d.id] !== 1).length;
  // Coverage over applicable items (unassessed count as 0%, excluded are left out), as in the app
  const applicable = data.filter(d => scores[d.id] !== 'na');
  const avg = applicable.length > 0
    ? Math.round(applicable.reduce((s,d) => s + (isScoredId(d.id) ? scores[d.id] : 0), 0) / applicable.length * 100)
    : 0;
  const alignColor   = accent === '#111' ? '#111' : '#00875a';
  const partialColor = accent === '#111' ? '#555' : '#b35a00';
  const riskColor    = accent === '#111' ? '#333' : '#c0001a';
  return `<div class="print-summary-grid">
    <div class="print-summary-box"><div class="psb-val" style="color:${accent}">${total}</div><div class="psb-label">Best Practices</div></div>
    <div class="print-summary-box"><div class="psb-val" style="color:${accent}">${assessed}</div><div class="psb-label">Assessed</div></div>
    <div class="print-summary-box"><div class="psb-val" style="color:${alignColor}">${aligned}</div><div class="psb-label">100% Aligned</div></div>
    <div class="print-summary-box"><div class="psb-val" style="color:${partialColor}">${partial}</div><div class="psb-label">Partial</div></div>
    <div class="print-summary-box"><div class="psb-val" style="color:${riskColor}">${highOpen}</div><div class="psb-label">High Risk Open</div></div>
    <div class="print-summary-box"><div class="psb-val" style="color:${accent}">${avg}%</div><div class="psb-label">Overall Score</div></div>
  </div>`;
}

function cleanHowToCheck(text) {
  if (!text) return '';

  let clean = text;

  // Remove HTML tags
  clean = clean.replace(/<[^>]*>/g, '');

  // Remove the trailing documentation pointer sentences
  clean = clean.replace(/for more information[\s\S]*?$/i, '');
  clean = clean.replace(/see the documentation[\s\S]*?$/i, '');
  clean = clean.replace(/consult the[\s\S]*?$/i, '');
  clean = clean.replace(/refer to[\s\S]*?$/i, '');

  // Remove any URL
  clean = clean.replace(/\s*https?:\/\/\S+/gi, '');

  // Remove a dangling "documentation" word at the end
  clean = clean.replace(/\s*documentation\.?\s*$/i, '');

  // Normalize whitespace but keep the line breaks between bullets
  clean = clean.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
  clean = clean.replace(/([?.!])\s*\1+/g, '$1');

  return clean;
}

function buildPrintDoc(opts, data) {
  const bw = opts.color === 'bw';
  const accent   = bw ? '#111' : '#FF9900';
  const grays    = ['#333', '#555', '#777', '#999', '#666', '#444'];
  const grayBgs  = ['#f4f4f4', '#efefef', '#eaeaea', '#e5e5e5', '#e9e9e9', '#f1f1f1'];
  const phColors = PILLARS.map((_, i) => bw ? grays[i % grays.length] : PILLAR_COLORS[i]);
  const phBgs    = PILLARS.map((_, i) => bw ? grayBgs[i % grayBgs.length] : PILLAR_COLORS[i] + '1f');
  const now = new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'});
  const published = (typeof LENS !== 'undefined' && LENS.published) ? LENS.published : 'June 10, 2026';

  const wrapOpen  = bw ? '<div class="print-bw">' : '<div>';
  const wrapClose = '</div>';

  let html = wrapOpen + `
  <div class="print-doc-header" style="border-bottom-color:${accent}">
    <div class="print-doc-logo">
      <svg width="36" height="36" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none">
        <path d="m 2 0 c -0.550781 0 -1 0.449219 -1 1 v 8 c 0 2.5 1.816406 4.246094 3.445312 5.332031 c 1.628907 1.085938 3.238282 1.617188 3.238282 1.617188 c 0.207031 0.070312 0.425781 0.070312 0.632812 0 c 0 0 1.609375 -0.53125 3.238282 -1.617188 c 1.628906 -1.085937 3.445312 -2.832031 3.445312 -5.332031 v -8 c 0 -0.550781 -0.449219 -1 -1 -1 z m 1 2 h 10 v 7 c 0 1.5 -1.183594 2.753906 -2.554688 3.667969 c -1.214843 0.808593 -2.179687 1.128906 -2.445312 1.226562 c -0.265625 -0.097656 -1.230469 -0.417969 -2.445312 -1.226562 c -1.371094 -0.914063 -2.554688 -2.167969 -2.554688 -3.667969 z m 1 1 v 6 c 0 1 0.867188 2.007812 2.109375 2.835938 c 0.933594 0.621093 1.472656 0.785156 1.890625 0.949218 c 0.417969 -0.164062 0.957031 -0.328125 1.890625 -0.949218 c 1.242187 -0.828126 2.109375 -1.835938 2.109375 -2.835938 v -6 z m 0 0" fill="${accent}"/>
      </svg>
      <div>
        <div class="print-doc-brand">AWS Well-Architected <span style="color:${accent}">Agentic AI Lens</span></div>
        <div class="print-doc-sub">Self-Assessment Report · Lens published ${escapeHtml(published)} ${bw ? '· B&amp;W' : '· Color'}</div>
      </div>
    </div>
    <div class="print-doc-meta">
      <strong>Generated:</strong> ${now}<br>
      <strong>Session:</strong> ${escapeHtml(sessions[currentSessionId]?.name || '—')}<br>
      <strong>Best practices:</strong> ${data.length} selected<br>
      <strong>Pillars:</strong> ${opts.phases.map(i => PILLAR_ABBR[i]).join(', ') || '—'}
    </div>
  </div>`;

  if (opts.summary) html += buildSummaryGrid(DATA, accent);

  // Group by pillar → focus area
  const grouped = {};
  data.forEach(item => {
    if (!grouped[item.pillar]) grouped[item.pillar] = {};
    if (!grouped[item.pillar][item.focus_area_id]) grouped[item.pillar][item.focus_area_id] = [];
    grouped[item.pillar][item.focus_area_id].push(item);
  });

  PILLARS.forEach((pillar, pi) => {
    if (!grouped[pillar]) return;
    html += `<div class="print-phase-heading" style="background:${phBgs[pi]};border-left:4px solid ${phColors[pi]}">
      ${escapeHtml(pillar)}
      <span class="ph-badge" style="background:${phColors[pi]}20;color:${phColors[pi]};border:1px solid ${phColors[pi]}40">${Object.values(grouped[pillar]).flat().length} best practices</span>
    </div>`;

    FOCUS_AREAS.filter(fa => fa.pillar === pillar).forEach(fa => {
      if (!grouped[pillar][fa.id]) return;
      const items = grouped[pillar][fa.id];
      html += `<div class="print-cap-heading"><em style="font-size:8px;font-style:italic;font-weight:700">${faShort(fa.id)}</em> — ${escapeHtml(fa.name)}${fa.question ? `<span class="print-fa-question">${escapeHtml(fa.id)}: ${escapeHtml(fa.question)}</span>` : ''}</div>`;

      if (opts.format === 'table') {
        html += `<table class="print-table"><thead><tr>
          <th style="width:92px;border-bottom-color:${accent}">ID</th>
          <th style="border-bottom-color:${accent}">Best practice</th>
          ${opts.risk ? `<th style="width:64px;border-bottom-color:${accent}">Risk</th>` : ''}
          ${opts.service ? `<th style="border-bottom-color:${accent}">AWS services</th>` : ''}
          <th style="width:110px;border-bottom-color:${accent}">Alignment</th>
          ${opts.cmts ? `<th style="border-bottom-color:${accent}">Comments</th>` : ''}
        </tr></thead><tbody>`;
        items.forEach(item => {
          html += `<tr>
            <td style="font-family:monospace;color:#888;white-space:nowrap;font-size:9px">${escapeHtml(item.id)}</td>
            <td>${escapeHtml(item.recommendation)}</td>
            ${opts.risk ? `<td>${riskChipHtml(item.risk, bw)}</td>` : ''}
            ${opts.service ? `<td style="font-size:9px">${item.aws_service && item.aws_service !== 'N/A' ? escapeHtml(item.aws_service) : '—'}</td>` : ''}
            <td>${scoreChipHtml(item.id, bw)}</td>
            ${opts.cmts ? `<td style="color:#555;font-size:9px">${escapeHtml(comments[item.id]||'')}</td>` : ''}
          </tr>`;
        });
        html += '</tbody></table>';
      } else {
        const guidBorder  = bw ? '#999' : '#FF9900';
        const howtoBorder = bw ? '#999' : '#4da6ff';
        items.forEach(item => {
          const svc = opts.service && item.aws_service && item.aws_service !== 'N/A'
            ? `<span class="print-card-service" style="${bw?'background:#f0f0f0;border-color:#ccc;color:#333':''}">${escapeHtml(item.aws_service)}</span>` : '';
          html += `<div class="print-card">
            <div class="print-card-header">
              <span class="print-card-id">${escapeHtml(item.id)}</span>
              <span class="print-card-title">${escapeHtml(item.recommendation)}</span>
              ${opts.risk ? riskChipHtml(item.risk, bw) : ''}
              ${svc}
            </div>
            <div class="print-card-footer">
              ${scoreChipHtml(item.id, bw)}
            </div>
            ${opts.guidance && item.guidance ? `<div class="print-card-guidance" style="border-left-color:${guidBorder}"><strong style="display:block;margin-bottom:2px;color:${bw?'#333':guidBorder}">Summary</strong>${item.guidance.trim().replace(/\n/g,'<br>')}</div>` : ''}
            ${opts.howto && item.how_to_check ? `<div class="print-card-guidance" style="border-left-color:${howtoBorder}"><strong style="display:block;margin-bottom:2px;color:${bw?'#333':howtoBorder}">Desired outcome</strong>${cleanHowToCheck(item.how_to_check).replace(/\n/g,'<br>')}</div>` : ''}
            ${opts.cmts && comments[item.id] ? `<div class="print-card-comment" style="${bw?'background:#f5f5f5;border-left-color:#999':''}"><strong style="display:block;margin-bottom:2px;color:${bw?'#333':'#666'}">Comments</strong>${escapeHtml(comments[item.id])}</div>` : ''}
          </div>`;
        });
      }
    });
  });

  html += `<div style="margin-top:14px;font-size:8px;color:#888;border-top:1px solid #ddd;padding-top:6px">
    Content condensed from the AWS Well-Architected Framework – Agentic AI Lens (AWS documentation, ${escapeHtml(published)}).
    Unofficial self-assessment aid; refer to https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/ for the authoritative text.
  </div>`;

  html += wrapClose;
  return html;
}

function refreshPreview() {
  const opts = getPrintOptions();
  const data = getPrintData(opts);
  document.getElementById('previewItemCount').textContent = `${data.length} items`;
  const doc = document.getElementById('previewDoc');
  doc.innerHTML = buildPrintDoc(opts, data);
  if (opts.color === 'bw') {
    doc.classList.add('print-bw');
  } else {
    doc.classList.remove('print-bw');
  }
}

function executePrint() {
  const opts = getPrintOptions();
  const data = getPrintData(opts);
  const html = buildPrintDoc(opts, data);
  const printArea = document.getElementById('printArea');
  printArea.innerHTML = `<div class="print-doc">${html}</div>`;
  if (opts.color === 'bw') {
    printArea.classList.add('print-bw');
  } else {
    printArea.classList.remove('print-bw');
  }
  closePrintModal();
  setTimeout(() => { window.print(); }, 100);
}

document.getElementById('printModal').addEventListener('click', function(e) {
  if (e.target === this) closePrintModal();
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { closePrintModal(); closeModal(); }
});

// ─── END PRINT PREVIEW ────────────────────────────────────────────────────────
