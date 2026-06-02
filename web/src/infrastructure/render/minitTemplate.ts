// Minit Mesyuarat (UTM) — faithful, table-based (prints reliably + opens in Word).
export interface MinitMember { nama: string; jawatan?: string; }
export interface MinitSig { peranan: string; nama: string; jawatan: string; tarikh?: string; }
export interface MinitBlock { type?: string; label?: string; text?: unknown; sub?: unknown[]; headers?: string[]; rows?: unknown[][]; }
export interface MinitSection { no: string; tajuk: string; status?: string; isi: MinitBlock[]; }
export interface MinitData {
  logoUrl?: string;
  title?: string;
  tajuk: string;
  namaKontraktor?: string;
  noSebutharga?: string;
  tarikhMula?: string;
  tarikhTamat?: string;
  tarikh?: string;
  masa?: string;
  tempat?: string;
  bil?: string;
  pengerusi?: MinitMember[];
  utmGroups?: { tajuk: string; ahli: MinitMember[] }[];
  kontraktor?: MinitMember[];
  agenda?: string[];
  seksyen: MinitSection[];
  tandatangan?: MinitSig[];
}

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function isTableLike(x: any): boolean {
  return !!x && typeof x === 'object' && (Array.isArray(x.rows) || Array.isArray(x.headers));
}
function renderTableLike(o: any): string {
  const headers: any[] = o.headers || o.header || [];
  const rows: any[] = o.rows || [];
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const body = rows.map((r) => {
    const cells = Array.isArray(r) ? r : (r && typeof r === 'object' ? Object.values(r) : [r]);
    return `<tr>${cells.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`;
  }).join('');
  return `<table class="mtbl">${head ? `<thead><tr>${head}</tr></thead>` : ''}<tbody>${body}</tbody></table>`;
}
function renderBlock(b: any): string {
  if (b == null) return '';
  if (typeof b !== 'object') return `<div class="mpara">${esc(b)}</div>`;
  if (b.type === 'subhead') return `<div class="msub">${esc(b.text)}</div>`;
  if (b.type === 'para') return `<div class="mpara">${esc(b.text)}</div>`;
  if (b.type === 'table' || isTableLike(b)) return renderTableLike(b);
  const subArr: any[] = Array.isArray(b.sub) ? b.sub : [];
  const subTables = subArr.filter(isTableLike).map(renderTableLike).join('');
  const bullets = subArr.filter((x) => !isTableLike(x));
  const subHtml = bullets.length
    ? `<ul class="msublist">${bullets.map((x) => `<li>${esc(typeof x === 'object' ? ((x as any).text ?? '') : x)}</li>`).join('')}</ul>` : '';
  const lab = b.label ? `<span class="mlabel">${esc(b.label)}</span>` : '';
  const txt = isTableLike(b.text) ? renderTableLike(b.text) : `<span class="mtext">${esc(typeof b.text === 'object' ? '' : b.text)}</span>`;
  return `<div class="mitem">${lab}${txt}${subHtml}${subTables}</div>`;
}

function members(arr: MinitMember[] | undefined, numbered: boolean): string {
  if (!arr || !arr.length) return '';
  return arr.map((m, i) => {
    const lead = numbered ? `${i + 1}.` : '&ndash;';
    const jaw = m.jawatan ? `<div class="atjaw">(${esc(m.jawatan)})</div>` : '';
    return `<div class="atln"><div class="atnm"><span class="atld">${lead}</span>${esc(m.nama)}</div>${jaw}</div>`;
  }).join('');
}

function sigCell(s: MinitSig): string {
  return `<td class="sig">
      <div class="sigrole">${esc(s.peranan)}</div>
      <div class="sigspace"></div>
      <div class="sigline">..................................................</div>
      <div class="signame">${esc(s.nama)}</div>
      <div class="sigjaw">${esc(s.jawatan)}</div>
      <div class="sigtar">Tarikh : ${s.tarikh ? esc(s.tarikh) : '_______________'}</div>
    </td>`;
}

export function renderMinit(d: MinitData): string {
  const title = d.title || 'MINIT MESYUARAT PEMANTAUAN KHAS';
  const logoSrc = d.logoUrl || '/utm-logo.png';

  const left = `${d.pengerusi && d.pengerusi.length ? `<div class="attgrp"><div class="atth">Pengerusi Mesyuarat :</div>${members(d.pengerusi, false)}</div>` : ''}`
    + `${(d.utmGroups || []).map((g) => `<div class="attgrp"><div class="atth">&#10148; ${esc(g.tajuk)}</div>${members(g.ahli, true)}</div>`).join('')}`;
  const right = `${d.kontraktor && d.kontraktor.length ? `<div class="attgrp"><div class="atth">KONTRAKTOR -</div><div class="atco">&#10148; ${esc(d.namaKontraktor || '')}</div>${members(d.kontraktor, true)}</div>` : ''}`;

  const agenda = (d.agenda && d.agenda.length)
    ? `<div class="agenda"><div class="agh">Agenda :</div><ol>${d.agenda.map((a) => `<li>${esc(a)}</li>`).join('')}</ol></div>` : '';

  const bodyRows = d.seksyen.map((sec) => `
      <tr>
        <td class="bno">${esc(sec.no)}</td>
        <td class="bperkara"><div class="sectaj">${esc(sec.tajuk)}</div>${sec.isi.map(renderBlock).join('')}</td>
        <td class="bstatus">${esc(sec.status || '')}</td>
      </tr>`).join('');

  const sigs = d.tandatangan || [];
  const sigBlock = sigs.length
    ? `<table class="sigtable">
        <tr>${sigs.slice(0, 2).map(sigCell).join('')}</tr>
        ${sigs.length > 2 ? `<tr>${sigs.slice(2, 4).map(sigCell).join('')}</tr>` : ''}
      </table>` : '';

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:12.5px;line-height:1.5}
  .page,.sheet2{width:210mm;margin:0 auto;padding:13mm;background:#fff;min-height:297mm}
  .sheet2{page-break-before:always}
  .hdrtbl{width:100%;border:1px solid #111;border-bottom:0;margin-bottom:0}
  .hdrtbl td{border:0;vertical-align:middle;padding:9px 10px}
  .hlogo{width:112px;text-align:center}
  .hlogo img{height:60px}
  .htitle{text-align:center;font-weight:800;letter-spacing:3px;font-size:19px;line-height:1.25}
  table{border-collapse:collapse}
  .info{width:100%;border:1px solid #111}
  .info td{border:1px solid #111;padding:7px 9px;vertical-align:top}
  .info .tk{width:50%}
  .info .rc{width:50%}
  .bar{width:100%;border:1px solid #111;border-top:0}
  .bar td{border:1px solid #111;padding:7px 9px;width:25%}
  .kehadlbl{margin:13px 0 5px;font-weight:700}
  .kehad{width:100%;border:1px solid #111}
  .kehad td{border:1px solid #111;padding:10px 12px;vertical-align:top;width:50%}
  .attgrp{margin-bottom:12px}
  .atth{font-weight:700;text-decoration:underline;margin-bottom:5px}
  .atco{font-weight:700;text-decoration:underline;margin:2px 0 6px}
  .atln{margin:5px 0 9px;padding-left:16px}
  .atnm{display:flex;gap:6px}
  .atld{flex:0 0 auto;min-width:15px}
  .atjaw{margin-left:21px;font-style:italic}
  .agenda{margin:14px 0 0}
  .agh{font-weight:700;margin-bottom:4px}
  .agenda ol{margin:0;padding-left:22px}
  .agenda li{margin:2px 0}
  .body{width:100%;border:1px solid #111}
  .body th{border:1px solid #111;background:#d9d9d9;padding:7px;font-weight:700;text-align:center}
  .body td{border:1px solid #111;padding:9px 11px;vertical-align:top}
  .body .bno{width:7%;text-align:center;font-weight:700}
  .body .bstatus{width:15%;text-align:center}
  .sectaj{font-weight:700;text-decoration:underline;margin-bottom:6px}
  .msub{font-weight:700;text-decoration:underline;margin:9px 0 4px}
  .mpara{margin:5px 0}
  .mitem{margin:6px 0;padding-left:48px;position:relative}
  .mlabel{position:absolute;left:22px}
  .msublist{margin:5px 0;padding-left:8px;list-style:none}
  .msublist li{margin:4px 0;position:relative;padding-left:18px}
  .msublist li:before{content:"\\2013";position:absolute;left:0}
  .mtbl{width:100%;border:1px solid #111;margin:7px 0}
  .mtbl th{border:1px solid #111;background:#ececec;padding:6px;text-align:center;font-weight:700}
  .mtbl td{border:1px solid #111;padding:6px 8px;text-align:center}
  .sigtable{width:100%;margin-top:30px}
  .sigtable td.sig{width:50%;vertical-align:top;padding:8px 16px 26px}
  .sigrole{margin-bottom:2px}
  .sigspace{height:50px}
  .signame{font-weight:700;margin-top:3px}
  .sigtar{margin-top:12px}
  @media print{@page{size:A4;margin:11mm}.page,.sheet2{width:auto;margin:0;padding:0;min-height:0}.body tr{page-break-inside:avoid}.sigtable{page-break-inside:avoid}}
  </style></head><body>
  <div class="page">
    <table class="hdrtbl"><tr><td class="hlogo"><img src="${logoSrc}" alt="UTM"></td><td class="htitle">${esc(title)}</td></tr></table>

    <table class="info">
      <tr>
        <td class="tk" rowspan="4">Tajuk Kerja :<br><b>${esc(d.tajuk)}</b></td>
        <td class="rc">Nama Kontraktor : <b>${esc(d.namaKontraktor)}</b></td>
      </tr>
      <tr><td class="rc">No. Sebutharga : <b>${esc(d.noSebutharga)}</b></td></tr>
      <tr><td class="rc">Tarikh Mula Kerja : <b>${esc(d.tarikhMula)}</b></td></tr>
      <tr><td class="rc">Tarikh Tamat Kerja : <b>${esc(d.tarikhTamat)}</b></td></tr>
    </table>
    <table class="bar">
      <tr>
        <td>Tarikh : <b>${esc(d.tarikh)}</b></td>
        <td>Masa : <b>${esc(d.masa)}</b></td>
        <td>Tempat : <b>${esc(d.tempat)}</b></td>
        <td>Bil. : <b>${esc(d.bil)}</b></td>
      </tr>
    </table>

    <div class="kehadlbl">Kehadiran :</div>
    <table class="kehad"><tr><td>${left}</td><td>${right}</td></tr></table>

    ${agenda}
  </div>

  <div class="sheet2">
    <table class="body">
      <thead><tr><th class="bno">Bil</th><th>Perkara</th><th class="bstatus">Status / Tindakan</th></tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    ${sigBlock}
  </div>
  </body></html>`;
}