// Faithful UTM "Laporan Harian Tapak Bina". Single 1px lines via grid gaps
// (dark background shows through), so adjacent cells never double up.
import { LB_CSS, renderLaporanBergambar } from './laporanBergambar';
type Dict = Record<string, any>;
const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as Dict)[c]);
function to12h(t: string) {
  if (!t) return '';
  const [hStr, mStr] = String(t).split(':');
  let h = parseInt(hStr, 10);
  const m = (mStr || '00').padStart(2, '0');
  const ampm = h < 12 ? 'PG' : 'PTG';
  if (h === 0) h = 12; else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}
// Returns true if the masa string represents a morning (pagi) time
function isPagi(masa: string): boolean {
  const s = String(masa || '').toLowerCase().trim();
  if (s.includes('petang') || s.includes('ptg') || s.includes(' pm')) return false;
  if (s.includes('pagi') || s.includes(' am') || s.includes(' pg')) return true;
  const m = s.match(/^(\d{1,2})[:.]/);
  if (m) return parseInt(m[1], 10) < 13;
  return true;
}
const bx = (v: any) => `<span class="bx">${esc(v)}</span>`;
const ck = (on: any) => `<span class="ck">${on ? '&#10003;' : ''}</span>`;
const cuaca = (sel: string) => ['cerah', 'mendung', 'hujan']
  .map((o) => (String(sel || '').toLowerCase() === o ? `<b>${o}</b>` : `<s>${o}</s>`)).join(' / ');
const SKOP = ['Senibina', 'Mekanikal', 'Elektrik', 'Awam', 'Lanskap'];
const JENTERA: [string, string][] = [['excavator', 'conc. Mixer'], ['backhoe', 'water pump'], ['crane', ''], ['lorry', ''], ['generator', '']];

const DIARY_CSS = `
  :root{--ink:#1f1f1f;--fs:8.7px}
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact} body{font-family:Arial,Helvetica,sans-serif;color:var(--ink);margin:0;font-size:var(--fs);line-height:1.35}
  .page{width:210mm;margin:0 auto;padding:7mm;background:#fff;min-height:297mm;display:flex;flex-direction:column}
  .page+.page{margin-top:28px;padding-top:14px;border-top:3px solid #7a0c2e}
  .frame{border:1.2px solid var(--ink);background:var(--ink);flex:1;display:flex;flex-direction:column;min-height:0}
  .stack{display:flex;flex-direction:column;gap:1px;background:var(--ink);flex:1;min-height:0}
  .cols{display:grid;gap:1px;background:var(--ink)}
  .c{background:#fff;padding:4px 6px}
  .lbl{font-weight:700;text-align:center;font-size:var(--fs)}
  .hdr{background:#5a5f66;color:#fff;font-weight:700;text-align:center;padding:3px 6px;font-size:var(--fs)}
  b,s{font-size:var(--fs)}
  .head{display:flex;align-items:center;gap:10px;padding:2px 2px 8px}
  .head img{height:44px} .dept{font-size:var(--fs)} .ref{margin-left:auto;font-size:7.5px;color:#666;text-align:right}
  .title{display:grid;grid-template-columns:1fr 168px 78px;gap:1px;background:var(--ink)}
  .title .t{background:#5a5f66;color:#fff;font:800 16px/1.1 Arial;font-style:italic;display:flex;align-items:center;padding:0 10px}
  .title .dh{background:#fff} .title .dh .r{padding:3px 6px} .title .dh .r:first-child{border-bottom:1px solid var(--ink)}
  .title .bil{background:#fff;display:flex;align-items:center;justify-content:center;font:800 14px/1 Arial}
  .ck{display:inline-flex;width:15px;height:11px;border:1px solid var(--ink);margin:0 4px;vertical-align:middle;align-items:center;justify-content:center;color:#0a7a33;font-size:8px}
  .bx{display:inline-block;min-width:28px;height:12px;border:1px solid var(--ink);vertical-align:middle;text-align:center;line-height:12px;padding:0 3px}
  .frow{display:flex;align-items:center;padding:2px 0}
  .trow{display:flex;align-items:center;gap:4px;padding:2px 0} .trow .nm{flex:1;border-bottom:1px dotted #999}
  table.pl{border-collapse:collapse;width:100%;height:100%;background:#fff} table.pl td{border:1px solid var(--ink);padding:3px 4px;vertical-align:top;font-size:var(--fs)}
  table.pl .ct{text-align:center;width:30px} table.pl thead td{background:#eee;font-weight:700;text-align:center}
  .plcell{background:#fff;padding:0;display:flex;flex-direction:column} .plgrow{flex:1;display:flex}
  .wl{margin:0;padding-left:13px;line-height:1.4}
  .jrow{display:flex;align-items:center;gap:4px;padding:2px 0} .jrow .nm{width:58px}
  .jrow .g{flex:1;display:flex;align-items:center;gap:4px} .jrow .ln{flex:1;border-bottom:1px dotted #999;height:11px}
  table.bh{border-collapse:collapse;width:100%} table.bh td{border:1px solid var(--ink);height:13px;padding:1px 4px}
  .box{padding:4px 6px;min-height:46px;background:#fff}
  table.st{border-collapse:collapse;width:100%} table.st td{border:1px solid var(--ink);padding:2px 4px}
  .sig{height:42px} .ttd{text-align:right;padding:0 6px 3px}
  .foot{font-size:7.5px;font-style:italic;padding:3px 2px}
  .lbwrap{padding:7mm}
  @media print{@page{size:A4;margin:0}body{margin:0}.page{width:auto;margin:0;padding:12mm 10mm;min-height:297mm}.page+.page{margin-top:0;border-top:none;page-break-before:always;break-before:page}.lbwrap{padding:10mm 8mm}}
`;

export function renderDiary(d: Dict): string {
  const logo = d.logoUrl || '/utm-logo.png';
  const lbHtml = renderLaporanBergambar(d.photoEntries, { projek: d.tajuk, disiplin: d.lbDisiplin, tajukLajur: d.lbTajukLajur });
  const skop = d.skop || {}, cu = d.cuaca || {}, jen = d.jentera || {}, peng = d.pengurusan || {}, st = d.status || {};
  const jv = (k: string) => (k ? (jen[k] ?? jen[k.toLowerCase()] ?? '') : '');
  const tenaga: [string, string][] = (d.tenaga && d.tenaga.senarai && d.tenaga.senarai.length)
    ? d.tenaga.senarai : [['penyelia di tapak', ''], ['tukang', ''], ['', ''], ['pekerja am / buruh', '']];
  const ol = (a: any) => (Array.isArray(a) && a.length ? `<ol class="wl">${a.map((x: any) => `<li>${esc(x)}</li>`).join('')}</ol>` : esc(a));
  const bahan = (d.bahan && d.bahan.length ? d.bahan : [['', ''], ['', ''], ['', ''], ['', '']]);

  // Split perlaksanaan into pagi / petang pages
  const allPerlak: Dict[] = d.perlaksanaan || [];
  const naturalPagi   = allPerlak.filter((p: Dict) =>  isPagi(p.masa));
  const naturalPetang = allPerlak.filter((p: Dict) => !isPagi(p.masa));
  const naturalSplit  = naturalPagi.length > 0 && naturalPetang.length > 0;

  let pagiRows: Dict[], petangRows: Dict[], hasBoth: boolean;
  if (naturalSplit) {
    // AI generated distinct Pagi + Petang entries — use them directly
    pagiRows = naturalPagi; petangRows = naturalPetang; hasBoth = true;
  } else if (allPerlak.length >= 2) {
    // All same-session — split in half so pagi/petang always land on separate pages
    const mid = Math.ceil(allPerlak.length / 2);
    pagiRows = allPerlak.slice(0, mid); petangRows = allPerlak.slice(mid); hasBoth = true;
  } else {
    pagiRows = allPerlak; petangRows = []; hasBoth = false;
  }

  function buildPerlakHtml(rows: Dict[]): string {
    return rows.map((p: Dict) => `<tr>
      <td class="ct">${esc(p.masa)}</td>
      <td>${Array.isArray(p.butiran) ? `<ol class="wl">${p.butiran.map((b: string) => `<li>${esc(b)}</li>`).join('')}</ol>` : esc(p.butiran)}</td>
      <td class="ct">${esc(p.kuantiti)}</td><td class="ct">${esc(p.kualiti)}</td></tr>`).join('')
      || '<tr><td></td><td style="height:210px"></td><td></td><td></td></tr>';
  }

  function buildPage(perlakData: Dict[], sessionLabel: string, isSecondPage: boolean): string {
    const perlak = buildPerlakHtml(perlakData);
    const hdrLabel = sessionLabel
      ? `PERLAKSANAAN KERJA — ${sessionLabel}`
      : 'PERLAKSANAAN KERJA KONTRAKTOR DI TAPAK';
    // Second page only carries perlaksanaan data — clear one-off notes
    const cat   = isSecondPage ? '' : d.catatan;
    const arh   = isSecondPage ? '' : d.arahan;
    const ujian = isSecondPage ? {} : (d.ujian || {});
    const penye = isSecondPage ? '' : d.penyelarasan;
    const komen = isSecondPage ? '' : d.komen;

    const pageStyle = isSecondPage
      ? ' style="page-break-before:always;break-before:page;margin-top:0"'
      : '';
    return `<div class="page"${pageStyle}>
  <div class="head"><img src="${logo}" alt="UTM"><div class="dept">Jabatan Timbalan Naib<br>Canselor (Pembangunan)</div><div class="ref">B-BPA/SP/LHTB<br>Pin. /2024</div></div>
  <div class="frame"><div class="stack">
    <div class="cols" style="grid-template-columns:auto 1fr"><div class="c" style="font-weight:700;white-space:nowrap">TAJUK KERJA :</div><div class="c" style="font-weight:700">${esc(d.tajuk)}</div></div>
    <div class="c" style="font-style:italic;font-size:7.5px">'Site Diary' hendaklah diisi dengan lengkap setiap hari oleh Penyelia dan ditandatangani (dengan cap jawatan) setiap minggu oleh Pegawai Yang Bertanggungjawab</div>
    <div class="title">
      <div class="t">LAPORAN HARIAN TAPAK BINA</div>
      <div class="dh"><div class="r"><b>TARIKH</b> : ${esc(d.tarikh)}</div><div class="r"><b>HARI</b> : ${esc(d.hari)}</div></div>
      <div class="bil">BIL: ${esc(d.bil)}</div>
    </div>
    <div class="cols" style="grid-template-columns:3fr 3fr 4fr">
      <div class="c"><div class="lbl">SKOP KERJA</div>${SKOP.map((s) => `<div class="frow">${ck(skop[s])}${s}</div>`).join('')}</div>
      <div class="c"><div class="lbl">CUACA</div><div style="text-align:center;font-style:italic;font-size:7px">batalkan yang tidak berkenaan</div>
        <div class="frow">${ck(false)}pagi : ${cuaca(cu.pagi)}</div><div class="frow">${ck(false)}petang : ${cuaca(cu.petang)}</div></div>
      <div class="c"><div class="lbl">TENAGA KERJA <span style="float:right;font-weight:400;font-size:7px">bil</span></div>
        ${tenaga.map(([n, b]: [string, string]) => `<div class="trow"><span class="nm">${esc(n)}</span>${bx(b)}</div>`).join('')}</div>
    </div>
    <div class="cols" style="grid-template-columns:3fr 2fr;flex:1">
      <div class="plcell"><div class="hdr">${hdrLabel}</div>
        <div class="plgrow"><table class="pl"><thead><tr><td>masa</td><td>butiran kerja kontraktor</td><td>kuantiti</td><td>*kualiti/spek.</td></tr></thead><tbody>${perlak}</tbody></table></div></div>
      <div class="stack">
        <div class="c"><div class="lbl">JENTERA / MESIN</div>
          ${JENTERA.map(([a, b]: [string, string]) => `<div class="jrow"><span class="nm">${a}</span>${bx(jv(a))}<span class="g">${b ? `${b} ${bx(jv(b))}` : `<span class="ln"></span>${bx('')}`}</span></div>`).join('')}</div>
        <div class="c"><div class="lbl">BAHAN BINAAN</div><table class="bh"><tr><td>bahan</td><td style="width:64px">bil dibekal</td></tr>${bahan.map(([a, b]: [string, string]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table></div>
        <div class="c" style="flex:1"><div class="lbl">*PENGURUSAN TAPAK</div>
          <div class="frow">keselamatan ${ck(peng['keselamatan'])} &nbsp; kebersihan ${ck(peng['kebersihan'])}</div>
          <div class="frow">papan tanda ${ck(peng['papan tanda'])} &nbsp; pakaian kerja ${ck(peng['pakaian kerja'])}</div>
          <div class="frow">waktu kerja : <span class="bx" style="min-width:56px">${esc(to12h(d.waktuMula))}</span> &ndash; <span class="bx" style="min-width:56px">${esc(to12h(d.waktuTamat))}</span></div></div>
      </div>
    </div>
    <div class="cols" style="grid-template-columns:3fr 3fr 4fr">
      <div class="c" style="padding:0"><div class="lbl" style="padding:3px 0">CATATAN PENYELIA</div><div class="box">${ol(cat)}</div></div>
      <div class="c" style="padding:0"><div class="lbl" style="padding:3px 0">ARAHAN KEPADA KONTRAKTOR</div><div class="box">${ol(arh)}</div></div>
      <div class="c" style="padding:0"><div class="lbl" style="padding:3px 0">UJIAN DI TAPAK <span style="font-weight:400;font-size:7px">(sekiranya ada/perlu)</span></div>
        <div class="cols" style="grid-template-columns:1fr 70px"><div class="c">keterangan ujian<br>${esc((ujian as Dict).keterangan)}</div><div class="c">keputusan<br>${esc((ujian as Dict).keputusan)}</div></div></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:1px;background:var(--ink);page-break-inside:avoid;break-inside:avoid">
    <div class="cols" style="grid-template-columns:3fr 2fr">
      <div class="c" style="padding:0"><div class="lbl" style="padding:3px 0">PENYELARASAN BERSAMA PELANGGAN <span style="font-weight:400;font-size:7px">(sekiranya ada/perlu)</span></div><div class="box">${esc(penye)}</div></div>
      <div class="c" style="padding:0"><div class="lbl" style="padding:3px 0">**STATUS KERJA</div>
        <table class="st"><tr><td rowspan="2">peratus<br>kemajuan</td><td>rancang :</td><td>${esc(st.rancang)} %</td></tr><tr><td>sebenar :</td><td>${esc(st.sebenar)} %</td></tr>
        <tr><td rowspan="2">tempoh<br>bekerja</td><td>rancang :</td><td>${esc(st.tempohRancang)} hari</td></tr><tr><td>sebenar :</td><td>${esc(st.tempohSebenar)} hari</td></tr></table></div>
    </div>
    <div class="cols" style="grid-template-columns:3fr 2fr">
      <div class="cols" style="grid-template-columns:1fr 1fr">
        <div class="c" style="padding:0"><div class="lbl" style="padding:3px 0">PENYELIA</div><div class="sig"></div></div>
        <div class="c" style="padding:0"><div class="lbl" style="padding:3px 0">KONTRAKTOR</div><div class="sig"></div></div>
      </div>
      <div class="c" style="padding:0"><div class="lbl" style="padding:3px 0">**KOMEN / ULASAN MINGGUAN <span style="font-weight:400;font-size:7px">(Pegawai Yang Bertanggungjawab)</span></div>
        <div class="box" style="min-height:30px">${esc(komen)}</div><div class="ttd">Tandatangan</div></div>
    </div>
    </div>
  </div></div>
  <div class="foot">* tandakan [ &#10003; ] ~ patuh ; [ X ] ~ tidak patuh ; ** pengisian secara mingguan oleh Pegawai Yang Bertanggungjawab</div>
  </div>`;
  }

  const page1 = buildPage(hasBoth ? pagiRows : allPerlak, hasBoth ? 'SESI PAGI' : '', false);
  const page2 = hasBoth ? buildPage(petangRows, 'SESI PETANG', true) : '';

  return `<!doctype html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=794"><title></title><style>${DIARY_CSS}${LB_CSS}</style></head><body>
  ${page1}
  ${page2}
  ${lbHtml ? `<div class="lbwrap">${lbHtml}</div>` : ''}
  </body></html>`;
}
