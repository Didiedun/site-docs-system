// Renders the site-diary data object into the print-ready UTM "Laporan Harian
// Tapak Bina" layout (the version validated with the user). DiaryRenderer port.
type Dict = Record<string, any>;
const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as Dict)[c]);
const chk = (on: boolean) => `<span class="chk">${on ? '&#10003;' : ''}</span>`;
const weather = (sel: string) => ['Cerah', 'Mendung', 'Hujan'].map((o) => `${chk(sel === o)}${o}`).join(' ');

export function renderDiary(d: Dict): string {
  const logo = d.logoUrl || '/utm-logo.png';
  const tenaga = d.tenaga || { senarai: [], total: '' };
  const status = d.status || {};
  const ol = (a: any[]) => `<ol class="wl">${(a || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`;
  const skopRows = Object.entries(d.skop || {}).map(([k, v]) => `<div class="row">${chk(!!v)}${esc(k)}</div>`).join('');
  const tenagaRows = (tenaga.senarai || []).map(([n, c]: [string, string]) => `<div class="row"><span>${esc(n)}</span><span class="cnt">${esc(c)}</span></div>`).join('');
  const bahanRows = (d.bahan || []).map(([b, q]: [string, string]) => `<tr><td>${esc(b)}</td><td>${esc(q)}</td></tr>`).join('');
  const perlak = (d.perlaksanaan || []).map((p: Dict) => `<div class="th">${esc(p.masa)}</div><ul class="wl">${(p.butiran || []).map((b: string) => `<li>${esc(b)}</li>`).join('')}</ul>`).join('');
  const peng = Object.entries(d.pengurusan || {}).map(([k, v]) => `${chk(!!v)}${esc(k)} `).join(' ');
  const cuaca = d.cuaca || {};

  return `<!doctype html><html lang="ms"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box} body{font-family:"Helvetica Neue",Arial,sans-serif;color:#16181d;margin:0}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:8mm;background:#fff}
  .frame{border:1.3px solid #3a3f47} .b{border:1px solid #3a3f47}
  .head{display:flex;align-items:center;gap:10px;padding:2px 0 8px} .head img{height:50px} .dept{font-size:10px;align-self:flex-end}
  .titlebar{display:flex;border-top:1px solid #3a3f47}
  .titlebar .t{flex:1;background:#1f2329;color:#fff;font:800 16px/1 Arial;font-style:italic;display:flex;align-items:center;padding:0 10px}
  .titlebar .dt{width:150px;font-size:10px;border-left:1px solid #3a3f47}
  .secband{background:#1f2329;color:#fff;font:700 9px/1 Arial;padding:4px 6px}
  .row{display:flex;font-size:9.5px;padding:2px 0} .cnt{margin-left:auto;border:1px solid #3a3f47;min-width:30px;text-align:center}
  .chk{display:inline-flex;width:11px;height:11px;border:1px solid #3a3f47;margin-right:5px;align-items:center;justify-content:center;font-size:9px;color:#0b6b2f}
  .main{display:grid;grid-template-columns:1.55fr 1fr} .cell{padding:5px 6px}
  table{border-collapse:collapse;width:100%;font-size:9px} td{border:1px solid #3a3f47;padding:3px 5px;vertical-align:top}
  .wl{font-size:9px;margin:0;padding-left:14px;line-height:1.45} .th{font-weight:700;font-size:9px;margin:3px 0 1px}
  .lower{display:grid;grid-template-columns:1.1fr 1fr 1fr;border-top:1px solid #3a3f47}
  .boxtitle{font:700 9px/1.2 Arial;padding:3px 6px;border-bottom:1px solid #3a3f47}
  .boxbody{padding:5px 6px;font-size:9px;min-height:60px} .ft{font-size:8px;color:#5b626d;font-style:italic;padding:4px 0}
  @media print{@page{size:A4;margin:6mm}.page{width:auto;margin:0;padding:6mm}}
  </style></head><body><div class="page">
  <div class="head"><img src="${logo}" alt="UTM"><div class="dept">Jabatan Timbalan Naib Canselor (Pembangunan)</div></div>
  <div class="frame">
    <div style="display:flex;font-size:10px;border-bottom:1px solid #3a3f47">
      <div style="font-weight:700;padding:5px 6px;border-right:1px solid #3a3f47">TAJUK KERJA :</div>
      <div style="font-weight:700;padding:5px 6px">${esc(d.tajuk)}</div></div>
    <div class="titlebar"><div class="t">LAPORAN HARIAN TAPAK BINA</div>
      <div class="dt"><div style="display:flex;border-bottom:1px solid #3a3f47"><b style="padding:4px 6px;width:54px">TARIKH</b><span style="padding:4px 6px">${esc(d.tarikh)}</span></div>
      <div style="display:flex"><b style="padding:4px 6px;width:54px">HARI</b><span style="padding:4px 6px">${esc(d.hari)}</span></div></div>
      <div style="border-left:1px solid #3a3f47;padding:0 8px;font:800 13px/1 Arial;display:flex;align-items:center">BIL: ${esc(d.bil)}</div></div>
    <div class="main">
      <div style="border-right:1px solid #3a3f47">
        <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #3a3f47">
          <div class="cell" style="border-right:1px solid #3a3f47"><b style="font-size:9.5px">SKOP KERJA</b>${skopRows}</div>
          <div class="cell"><b style="font-size:9.5px">CUACA</b><div style="font-size:9px;margin-top:3px"><b>pagi</b> : ${weather(cuaca.pagi)}</div><div style="font-size:9px"><b>petang</b> : ${weather(cuaca.petang)}</div></div>
        </div>
        <div class="secband">PERLAKSANAAN KERJA KONTRAKTOR DI TAPAK</div>
        <div style="padding:5px 6px">${perlak}</div>
      </div>
      <div>
        <div class="cell b"><b style="font-size:9.5px">TENAGA KERJA</b>${tenagaRows}<div class="row" style="font-weight:700;border-top:1px solid #c4c8ce;margin-top:3px;padding-top:3px"><span>Jumlah</span><span class="cnt">${esc(tenaga.total)}</span></div></div>
        <div class="cell b"><b style="font-size:9.5px">BAHAN BINAAN</b><table><tr><td>bahan</td><td>bil dibekal</td></tr>${bahanRows}</table></div>
        <div class="cell b"><b style="font-size:9.5px">*PENGURUSAN TAPAK</b><div style="font-size:9px;margin-top:3px">${peng}</div></div>
      </div>
    </div>
    <div class="lower">
      <div style="border-right:1px solid #3a3f47"><div class="boxtitle">CATATAN PENYELIA</div><div class="boxbody">${ol(d.catatan)}</div></div>
      <div style="border-right:1px solid #3a3f47"><div class="boxtitle">ARAHAN KEPADA KONTRAKTOR</div><div class="boxbody">${ol(d.arahan)}</div></div>
      <div><div class="boxtitle">PENYELARASAN BERSAMA PELANGGAN</div><div class="boxbody">${esc(d.penyelarasan)}</div></div>
    </div>
    <div class="lower">
      <div style="border-right:1px solid #3a3f47;padding:6px"><b style="font-size:9px">STATUS KERJA</b><div style="font-size:9px;margin-top:4px">Peratus kemajuan — Rancang: ${esc(status.rancang)}% · Sebenar: ${esc(status.sebenar)}%</div></div>
      <div style="border-right:1px solid #3a3f47;padding:6px"><b style="font-size:9px">PENYELIA</b><div style="height:48px"></div></div>
      <div style="padding:6px"><b style="font-size:9px">KONTRAKTOR</b><div style="height:48px"></div></div>
    </div>
  </div><div class="ft">* tandakan [ &#10003; ] ~ patuh ; [ X ] ~ tidak patuh ; ** mingguan oleh Pegawai Yang Bertanggungjawab</div>
  </div></body></html>`;
}
