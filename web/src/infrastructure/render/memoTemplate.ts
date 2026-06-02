// Faithful UTM project MEMO. Header fields (Bil, No. Rujukan, Tarikh, names) are
// user-supplied — never invented. The AI fills only `blok` (body) and `penutup`.
// Cogan "Malaysia Madani" and the s.k. block are always included. The Laporan
// Bergambar (shared module) prints on its own page so the packet is one PDF.
import { LB_CSS, renderLaporanBergambar } from './laporanBergambar';
type Dict = Record<string, any>;
const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as Dict)[c]);
const br = (s: any) => esc(s).replace(/\n/g, '<br>');

function renderTable(t: Dict): string {
  const punca = Array.isArray(t.punca) && t.punca.length ? t.punca : null;
  const heads = [...(t.headers || []), ...(punca ? ['Punca Kelewatan'] : [])].map((h: any) => `<th>${esc(h)}</th>`).join('');
  const n = (t.rows || []).length || 1;
  const puncaCell = punca ? `<td class="puncacell" rowspan="${n}"><ol class="puncaol">${punca.map((x: any) => `<li>${br(x)}</li>`).join('')}</ol></td>` : '';
  const rows = (t.rows || []).map((r: any[], i: number) => `<tr>${(r || []).map((c) => `<td>${br(c)}</td>`).join('')}${punca && i === 0 ? puncaCell : ''}</tr>`).join('');
  return `${t.title ? `<div class="tt">${esc(t.title)}</div>` : ''}<table class="mt">${heads ? `<thead><tr>${heads}</tr></thead>` : ''}<tbody>${rows}</tbody></table>`;
}

export function renderMemo(d: Dict): string {
  const logo = d.logoUrl || '/utm-logo.png';
  let n = 1; // perenggan 1 = pembuka tetap
  const body = (d.blok || []).map((b: Dict) => {
    if (b.type === 'para') { n += 1; return `<div class="para"><span class="num">${n}.</span><span class="ptx">${br(b.text)}</span></div>`; }
    if (b.type === 'subhead') return `<div class="sub">${esc(b.text)}</div>`;
    if (b.type === 'table') return `<div class="tblwrap">${renderTable(b)}</div>`;
    return '';
  }).join('');
  const penutup = (d.penutup && d.penutup.length ? d.penutup : ['Kerjasama dan tindakan segera dari pihak tuan adalah amat dihargai.', 'Sekian, terima kasih.'])
    .map((p: any) => `<p class="cl">${br(p)}</p>`).join('');

  const cogan = `<p class="cogan">&ldquo; MALAYSIA MADANI &rdquo;</p><p class="cogan">&ldquo; BERKHIDMAT UNTUK NEGARA &rdquo;</p>`;
  const roleLines = [d.jawatanTtd, d.unitTtd].filter(Boolean).map((x: any) => br(x)).join('<br>');
  const emailLine = d.emelTtd ? `${roleLines ? '<br>' : ''}&#9993; ${esc(d.emelTtd)}` : '';
  const roleBlock = roleLines || emailLine ? `<div class="sigrole">${roleLines}${emailLine}</div>` : '';
  const sig = d.namaTtd
    ? `<p class="amanah">Saya yang menjalankan amanah,</p><div class="sigsp"></div><p class="signame">(${esc(d.namaTtd)})</p>${roleBlock}`
    : '';
  const sk = `<div class="sk"><div class="skh">s.k.</div><div class="skb">${br(d.sk || '')}</div></div>`;
  const photoPage = renderLaporanBergambar(d.photoEntries, { projek: d.projek, disiplin: d.lbDisiplin, tajukLajur: d.lbTajukLajur });

  return `<!doctype html><html lang="ms"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1b1b1b;margin:0;font-size:11px;line-height:1.5}
  .page{width:210mm;margin:0 auto;padding:16mm 18mm;background:#fff}
  .top{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid #1b1b1b;padding-bottom:8px}
  .top .lhs{display:flex;align-items:center;gap:10px} .top img{height:46px} .dept{font-size:10px;line-height:1.25}
  .memo{font:800 30px/1 Arial;letter-spacing:1px}
  .bil{text-align:right;font-weight:800;font-size:12px;margin:10px 0 2px}
  .ref{display:grid;grid-template-columns:auto auto auto;gap:3px 6px;width:max-content;margin-left:auto;font-size:11px;margin-bottom:10px}
  .meta{display:grid;grid-template-columns:92px 10px 1fr;row-gap:6px;border-bottom:2px solid #1b1b1b;padding-bottom:10px}
  .meta .lab{font-weight:700} .meta .val{font-weight:700} .meta .full{grid-column:1 / -1;font-weight:400}
  .body{padding-top:10px}
  .intro{margin:0 0 8px}
  .para{display:flex;gap:8px;margin:8px 0;text-align:justify} .para .num{flex:0 0 22px} .para .ptx{flex:1}
  .sub{text-align:center;font-weight:700;text-decoration:underline;margin:12px 0 6px}
  .tblwrap{margin:8px 0} .tt{font-weight:700;margin:6px 0 4px}
  table.mt{border-collapse:collapse;width:100%;font-size:10.5px} table.mt th,table.mt td{border:1px solid #1b1b1b;padding:5px 7px;vertical-align:top}
  table.mt th{background:#e9e9e9;text-align:center;font-weight:700}
  .puncacell{vertical-align:top;text-align:left} .puncaol{margin:0;padding-left:18px} .puncaol li{margin:2px 0}
  .cl{margin:10px 0 0}
  .cogan{font-weight:700;font-style:italic;margin:14px 0 0} .amanah{margin:16px 0 0}
  .sigsp{height:46px} .signame{font-weight:700;margin:0} .sigrole{margin:0;font-size:10.5px;line-height:1.4}
  .sk{display:grid;grid-template-columns:40px 1fr;margin-top:22px;font-size:10.5px} .skh{font-weight:400}
  ${LB_CSS}
  @media print{@page{size:A4;margin:0}.page{width:auto;margin:0}}
  </style></head><body><div class="page">
    <div class="top">
      <div class="lhs"><img src="${logo}" alt="UTM"><div class="dept">Jabatan Timbalan Naib Canselor<br>(Pembangunan)</div></div>
      <div class="memo">MEMO</div>
    </div>
    <div class="bil">MEMO BIL. : ${esc(d.bil)}</div>
    <div class="ref"><span>No. Rujukan</span><span>:</span><b>${esc(d.noRujukan)}</b><span>Tarikh</span><span>:</span><b>${esc(d.tarikh)}</b></div>
    <div class="meta">
      <div class="lab">DARIPADA</div><div>:</div><div class="val">${br(d.daripada)}</div>
      <div class="lab">KEPADA</div><div>:</div><div class="val">${br(d.kepada)}</div>
      ${d.tuan ? `<div class="full">Tuan,</div>` : ''}
      <div class="lab">PROJEK</div><div>:</div><div class="val">${br(d.projek)}${d.tajuk ? `<br>- ${esc(d.tajuk)}` : ''}</div>
    </div>
    <div class="body">
      <p class="intro">Dengan segala hormatnya perkara di atas adalah dirujuk.</p>
      ${body}
      ${penutup}
      ${cogan}
      ${sig}
      ${sk}
    </div>
    ${photoPage}
  </div></body></html>`;
}
