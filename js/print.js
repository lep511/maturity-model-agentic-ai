// ─── PRINT PREVIEW ────────────────────────────────────────────────────────────

function openPrintPreview() {
  // Build capability checkboxes
  const capBox = document.getElementById('capCheckboxes');
  capBox.innerHTML = '';
  CAPABILITIES.forEach((cap, i) => {
    const lbl = document.createElement('label');
    lbl.className = 'print-checkbox-row';
    lbl.innerHTML = `<input type="checkbox" class="cap-chk" value="${i}" checked onchange="refreshPreview()">
      <span class="print-checkbox-label" style="font-size:11px">${cap}</span>`;
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
  const caps     = [...document.querySelectorAll('.cap-chk:checked')].map(c => parseInt(c.value));
  const guidance = document.getElementById('tog-guidance').checked;
  const howto    = document.getElementById('tog-howto').checked;
  const cmts     = document.getElementById('tog-comments').checked;
  const service  = document.getElementById('tog-service').checked;
  const summary  = document.getElementById('tog-summary').checked;
  return { format, items, color, phases, caps, guidance, howto, cmts, service, summary };
}

function getPrintData(opts) {
  return DATA.filter(d => {
    const phIdx = PHASES.indexOf(d.phase);
    if (!opts.phases.includes(phIdx)) return false;
    const capIdx = CAPABILITIES.indexOf(d.capability);
    if (!opts.caps.includes(capIdx)) return false;
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

function buildSummaryGrid(data, accent) {
  const total    = data.length;
  const assessed = data.filter(d => scores[d.id] !== null && scores[d.id] !== undefined && scores[d.id] !== 'na').length;
  const aligned  = data.filter(d => scores[d.id] === 1).length;
  const partial  = data.filter(d => scores[d.id] > 0 && scores[d.id] < 1).length;
  const avg = assessed > 0
    ? Math.round(data.filter(d => scores[d.id] !== null && scores[d.id] !== undefined && scores[d.id] !== 'na')
        .reduce((s,d) => s + (scores[d.id] || 0), 0) / assessed * 100)
    : 0;
  const alignColor   = accent === '#111' ? '#111' : '#00875a';
  const partialColor = accent === '#111' ? '#555' : '#b35a00';
  return `<div class="print-summary-grid">
    <div class="print-summary-box"><div class="psb-val" style="color:${accent}">${total}</div><div class="psb-label">Total Items</div></div>
    <div class="print-summary-box"><div class="psb-val" style="color:${accent}">${assessed}</div><div class="psb-label">Assessed</div></div>
    <div class="print-summary-box"><div class="psb-val" style="color:${alignColor}">${aligned}</div><div class="psb-label">100% Aligned</div></div>
    <div class="print-summary-box"><div class="psb-val" style="color:${partialColor}">${partial}</div><div class="psb-label">Partial</div></div>
    <div class="print-summary-box"><div class="psb-val" style="color:${accent}">${avg}%</div><div class="psb-label">Avg Score</div></div>
  </div>`;
}

function cleanHowToCheck(text) {
  if (!text) return '';

  let clean = text;

  // Delte all tags from HTML
  clean = clean.replace(/<[^>]*>/g, '');

  // Delete comun words
  clean = clean.replace(/for more information[\s\S]*?$/i, '');
  clean = clean.replace(/see the documentation[\s\S]*?$/i, '');
  clean = clean.replace(/consult the[\s\S]*?$/i, '');
  clean = clean.replace(/refer to[\s\S]*?$/i, '');

  // Delete any url 
  clean = clean.replace(/\s*https?:\/\/\S+/gi, '');
  clean = clean.replace(/\s*security\.aws\.dev[^\s'">]*/gi, '');

  // Delete documentation word at the end
  clean = clean.replace(/\s*documentation\.?\s*$/i, '');

  // Clean spaces and extra points.
  clean = clean.replace(/\s+/g, ' ').trim();
  clean = clean.replace(/([?.!])\s*\1+/g, '$1');   // ?? → ?
  clean = clean.replace(/\?\s*\.?\s*$/, '?');

  return clean;
}

function buildPrintDoc(opts, data) {
  const bw = opts.color === 'bw';
  const accent   = bw ? '#111' : '#FF9900';
  const accentBg = bw ? '#f0f0f0' : '#fff3e0';
  const phColors = bw
    ? ['#333','#555','#777','#999']
    : ['#FF9900','#3ecf8e','#4da6ff','#b47aff'];
  const phBgs = bw
    ? ['#f4f4f4','#efefef','#eaeaea','#e5e5e5']
    : ['#fff4e0','#eafaf4','#e8f3ff','#f4eeff'];
  const now = new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'});

  const wrapOpen  = bw ? '<div class="print-bw">' : '<div>';
  const wrapClose = '</div>';

  let html = wrapOpen + `
  <div class="print-doc-header" style="border-bottom-color:${accent}">
    <div class="print-doc-logo">
      <svg width="36" height="36" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none">
        <path d="m 2 0 c -0.550781 0 -1 0.449219 -1 1 v 8 c 0 2.5 1.816406 4.246094 3.445312 5.332031 c 1.628907 1.085938 3.238282 1.617188 3.238282 1.617188 c 0.207031 0.070312 0.425781 0.070312 0.632812 0 c 0 0 1.609375 -0.53125 3.238282 -1.617188 c 1.628906 -1.085937 3.445312 -2.832031 3.445312 -5.332031 v -8 c 0 -0.550781 -0.449219 -1 -1 -1 z m 1 2 h 10 v 7 c 0 1.5 -1.183594 2.753906 -2.554688 3.667969 c -1.214843 0.808593 -2.179687 1.128906 -2.445312 1.226562 c -0.265625 -0.097656 -1.230469 -0.417969 -2.445312 -1.226562 c -1.371094 -0.914063 -2.554688 -2.167969 -2.554688 -3.667969 z m 1 1 v 6 c 0 1 0.867188 2.007812 2.109375 2.835938 c 0.933594 0.621093 1.472656 0.785156 1.890625 0.949218 c 0.417969 -0.164062 0.957031 -0.328125 1.890625 -0.949218 c 1.242187 -0.828126 2.109375 -1.835938 2.109375 -2.835938 v -6 z m 0 0" fill="${accent}"/>
      </svg>
      <div>
        <div class="print-doc-brand">AWS Security <span style="color:${accent}">Maturity Model</span></div>
        <div class="print-doc-sub">Self-Assessment Report · v2 ${bw ? '· B&amp;W' : '· Color'}</div>
      </div>
    </div>
    <div class="print-doc-meta">
      <strong>Generated:</strong> ${now}<br>
      <strong>Session:</strong> ${sessions[currentSessionId]?.name || '—'}<br>
      <strong>Items:</strong> ${data.length} selected<br>
      <strong>Phases:</strong> ${opts.phases.map(i => 'P'+(i+1)).join(', ') || '—'}
    </div>
  </div>`;

  if (opts.summary) html += buildSummaryGrid(DATA, accent);

  // Group by phase → capability
  const grouped = {};
  data.forEach(item => {
    const ph = item.phase;
    const cap = item.capability;
    if (!grouped[ph]) grouped[ph] = {};
    if (!grouped[ph][cap]) grouped[ph][cap] = [];
    grouped[ph][cap].push(item);
  });

  PHASES.forEach((phase, pi) => {
    if (!grouped[phase]) return;
    html += `<div class="print-phase-heading" style="background:${phBgs[pi]};border-left:4px solid ${phColors[pi]}">
      Phase ${pi+1}: ${PHASE_SHORT[pi]}
      <span class="ph-badge" style="background:${phColors[pi]}20;color:${phColors[pi]};border:1px solid ${phColors[pi]}40">${Object.values(grouped[phase]).flat().length} items</span>
    </div>`;

    CAPABILITIES.forEach(cap => {
      if (!grouped[phase][cap]) return;
      const items = grouped[phase][cap];
      html += `<div class="print-cap-heading">${CAP_ICONS[cap] ? `<em style="font-size:8px;font-style:italic;font-weight:700">${CAP_ICONS[cap]}</em> — ` : ''}${cap}</div>`;
      
      if (opts.format === 'table') {
        let thService = opts.service ? '<th>AWS Service</th>' : '';
        html += `<table class="print-table"><thead><tr>
          <th style="width:40px;border-bottom-color:${accent}">ID</th>
          <th style="border-bottom-color:${accent}">Recommendation</th>
          ${thService ? `<th style="border-bottom-color:${accent}">AWS Service</th>` : ''}
          <th style="width:110px;border-bottom-color:${accent}">Alignment</th>
          ${opts.cmts ? `<th style="border-bottom-color:${accent}">Comments</th>` : ''}
        </tr></thead><tbody>`;
        items.forEach(item => {
          let tdService = opts.service ? `<td>${item.aws_service !== 'N/A' ? item.aws_service : '—'}</td>` : '';
          html += `<tr>
            <td style="font-family:monospace;color:#888;white-space:nowrap">${item.id}</td>
            <td>${item.recommendation}</td>
            ${tdService}
            <td>${scoreChipHtml(item.id, bw)}</td>
            ${opts.cmts ? `<td style="color:#555;font-size:9px">${comments[item.id]||''}</td>` : ''}
          </tr>`;
        });
        html += '</tbody></table>';
      } else {
        const guidBorder  = bw ? '#999' : '#FF9900';
        const howtoBorder = bw ? '#999' : '#4da6ff';
        items.forEach(item => {
          const svc = opts.service && item.aws_service && item.aws_service !== 'N/A'
            ? `<span class="print-card-service" style="${bw?'background:#f0f0f0;border-color:#ccc;color:#333':''}">${item.aws_service}</span>` : '';
          html += `<div class="print-card">
            <div class="print-card-header">
              <span class="print-card-id">${item.id}</span>
              <span class="print-card-title">${item.recommendation}</span>
              ${svc}
            </div>
            <div class="print-card-footer">
              ${scoreChipHtml(item.id, bw)}
            </div>
            ${opts.guidance && item.guidance ? `<div class="print-card-guidance" style="border-left-color:${guidBorder}"><strong style="display:block;margin-bottom:2px;color:${bw?'#333':guidBorder}">Guidance</strong>${item.guidance.trim().replace(/\n/g,'<br>')}</div>` : ''}
            ${opts.howto && item.how_to_check ? `<div class="print-card-guidance" style="border-left-color:${howtoBorder}"><strong style="display:block;margin-bottom:2px;color:${bw?'#333':howtoBorder}">How to check</strong>${cleanHowToCheck(item.how_to_check).replace(/\n/g,'<br>')}</div>` : ''}
            ${opts.cmts && comments[item.id] ? `<div class="print-card-comment" style="${bw?'background:#f5f5f5;border-left-color:#999':''}"><strong style="display:block;margin-bottom:2px;color:${bw?'#333':'#666'}">Comments</strong>${comments[item.id]}</div>` : ''}
          </div>`;
        });
      }
    });
  });

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