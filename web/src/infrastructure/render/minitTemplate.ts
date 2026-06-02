// Minit Mesyuarat (UTM) — faithful, table-based layout (prints reliably and
// opens cleanly in Word/Pages/Docs since it uses real table borders).
export interface MinitSig { peranan: string; nama: string; jawatan: string; tarikh?: string; }
export interface MinitBlock {
  type: 'item' | 'subhead' | 'para' | 'table';
  label?: string;
  text?: string;
  sub?: string[];
  headers?: string[];
  rows?: string[][];
}
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
  pengerusi?: string[];
  utmGroups?: { tajuk: string; ahli: string[] }[];
  kontraktor?: string[];
  agenda?: string[];
  seksyen: MinitSection[];
  tandatangan?: MinitSig[];
}

const esc = (s: unknown) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// italicise any "(...)" jawatan note inside an attendance line
const attLine = (s: string) => esc(s).replace(/\(([^)]*)\)/g, '<i>($1)</i>');

function renderBlock(b: MinitBlock): string {
  if (b.type === 'subhead') return `<div class="msub">${esc(b.text)}</div>`;
  if (b.type === 'para') return `<div class="mpara">${esc(b.text)}</div>`;
  if (b.type === 'table') {
    const head = (b.headers || []).map((h) => `<th>${esc(h)}</th>`).join('');
    const body = (b.rows || []).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
    return `<table class="mtbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  }
  const sub = (b.sub && b.sub.length)
    ? `<ul class="msublist">${b.sub.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : '';
  const lab = b.label ? `<span class="mlabel">${esc(b.label)}</span>` : '';
  return `<div class="mitem">${lab}<span class="mtext">${esc(b.text)}</span>${sub}</div>`;
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
  const logo = d.logoUrl ? `<img class="logo" src="${d.logoUrl}" alt="UTM" />` : '';

  const att = (label: string, arr?: string[]) =>
    (arr && arr.length)
      ? `<div class="attgrp"><div class="atth">${esc(label)}</div>${arr.map((x) => `<div class="attln">${attLine(x)}</div>`).join('')}</div>`
      : '';

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

  const agenda = (d.agenda && d.agenda.length)
    ? `<div class="agenda"><div class="agh">Agenda :</div><ol>${d.agenda.map((a) => `<li>${esc(a)}</li>`).join('')}</ol></div>` : '';

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:11px;line-height:1.45}
  .page{width:210mm;margin:0 auto;padding:12mm;background:#fff}
  .top{display:flex;align-items:center;gap:14px;margin-bottom:12px}
  .logo{height:52px}
  .mtitle{margin-left:auto;text-align:right;font-weight:800;letter-spacing:3px;font-size:15px;line-height:1.25}
  table{border-collapse:collapse}
  .info{width:100%;border:1px solid #111}
  .info td{border:1px solid #111;padding:5px 7px;vertical-align:top}
  .info .tk{width:52%}
  .info .lbl{width:19%;font-weight:400;white-space:nowrap}
  .bar{width:100%;border:1px solid #111;border-top:0}
  .bar td{border:1px solid #111;padding:5px 7px}
  .kehadlbl{margin:11px 0 4px;font-weight:700}
  .kehad{width:100%;border:1px solid #111}
  .kehad td{border:1px solid #111;padding:8px 10px;vertical-align:top;width:50%}
  .attgrp{margin-bottom:9px}
  .atth{font-weight:700;text-decoration:underline;margin-bottom:3px}
  .attln{margin:1px 0;padding-left:14px;text-indent:-14px}
  .agenda{margin:12px 0}
  .agh{font-weight:700;margin-bottom:3px}
  .agenda ol{margin:0;padding-left:20px}
  .agenda li{margin:1px 0}
  .body{width:100%;border:1px solid #111;margin-top:2px}
  .body th{border:1px solid #111;background:#d9d9d9;padding:6px;font-weight:700;text-align:center}
  .body td{border:1px solid #111;padding:7px 9px;vertical-align:top}
  .body .bno{width:7%;text-align:center;font-weight:700}
  .body .bstatus{width:15%;text-align:center}
  .sectaj{font-weight:700;text-decoration:underline;margin-bottom:4px}
  .msub{font-weight:700;text-decoration:underline;margin:7px 0 3px}
  .mpara{margin:3px 0}
  .mitem{margin:3px 0;padding-left:24px;position:relative}
  .mlabel{position:absolute;left:0}
  .mtext{}
  .msublist{margin:3px 0;padding-left:6px;list-style:none}
  .msublist li{margin:2px 0;position:relative;padding-left:16px}
  .msublist li:before{content:"\\2013";position:absolute;left:0}
  .mtbl{width:100%;border:1px solid #111;margin:6px 0}
  .mtbl th{border:1px solid #111;background:#ececec;padding:4px 5px;text-align:center;font-weight:700}
  .mtbl td{border:1px solid #111;padding:4px 6px;text-align:center}
  .sigtable{width:100%;margin-top:26px}
  .sigtable td.sig{width:50%;vertical-align:top;padding:6px 14px 22px}
  .sigrole{margin-bottom:2px}
  .sigspace{height:46px}
  .sigline{letter-spacing:1px}
  .signame{font-weight:700;margin-top:2px}
  .sigtar{margin-top:10px}
  @media print{@page{size:A4;margin:9mm}.page{width:auto;margin:0;padding:0}.body,.info,.kehad,.mtbl{page-break-inside:auto}tr{page-break-inside:avoid}}
  </style></head><body>
  <div class="page">
    <div class="top">${logo}<div class="mtitle">${esc(title)}</div></div>

    <table class="info">
      <tr>
        <td class="tk" rowspan="4">Tajuk Kerja :<br><b>${esc(d.tajuk)}</b></td>
        <td class="lbl">Nama Kontraktor</td><td>: ${esc(d.namaKontraktor)}</td>
      </tr>
      <tr><td class="lbl">No. Sebutharga</td><td>: ${esc(d.noSebutharga)}</td></tr>
      <tr><td class="lbl">Tarikh Mula Kerja</td><td>: ${esc(d.tarikhMula)}</td></tr>
      <tr><td class="lbl">Tarikh Tamat Kerja</td><td>: ${esc(d.tarikhTamat)}</td></tr>
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
    <table class="kehad">
      <tr>
        <td>${att('Pengerusi Mesyuarat :', d.pengerusi)}${(d.utmGroups || []).map((g) => att(g.tajuk, g.ahli)).join('')}</td>
        <td>${att('Kontraktor — ' + (d.namaKontraktor || ''), d.kontraktor)}</td>
      </tr>
    </table>

    ${agenda}

    <table class="body">
      <thead><tr><th class="bno">Bil</th><th>Perkara</th><th class="bstatus">Status / Tindakan</th></tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>

    ${sigBlock}
  </div>
  </body></html>`;
}