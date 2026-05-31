// Faithful HTML reproduction of the UTM "Laporan Harian Tapak Bina" form.
type Dict = Record<string, any>;
const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as Dict)[c]);
const bx = (v: any) => `<span class="bx">${esc(v)}</span>`;
const ck = (on: any) => `<span class="ck">${on ? '&#10003;' : ''}</span>`;
const cuaca = (sel: string) => ['cerah', 'mendung', 'hujan']
  .map((o) => (String(sel || '').toLowerCase() === o ? `<b>${o}</b>` : `<s>${o}</s>`)).join(' / ');

const SKOP = ['Senibina', 'Mekanikal', 'Elektrik', 'Awam', 'Lanskap'];
const JENTERA: [string, string][] = [['excavator', 'conc. Mixer'], ['backhoe', 'water pump'], ['crane', ''], ['lorry', ''], ['generator', '']];

export function renderDiary(d: Dict): string {
  const logo = d.logoUrl || '/utm-logo.png';
  const skop = d.skop || {};
  const cu = d.cuaca || {};
  const jen = d.jentera || {};
  const jv = (k: string) => (k ? (jen[k] ?? jen[k.toLowerCase()] ?? '') : '');
  const peng = d.pengurusan || {};
  const st = d.status || {};
  const tenaga: [string, string][] = (d.tenaga && d.tenaga.senarai && d.tenaga.senarai.length)
    ? d.tenaga.senarai
    : [['penyelia di tapak', ''], ['tukang', ''], ['', ''], ['pekerja am / buruh', '']];
  const ol = (a: any) => (Array.isArray(a) && a.length ? `<ol class="wl">${a.map((x: any) => `<li>${esc(x)}</li>`).join('')}</ol>` : esc(a));
  const perlak = (d.perlaksanaan || []).map((p: Dict) => `<tr>
      <td class="c">${esc(p.masa)}</td>
      <td>${Array.isArray(p.butiran) ? `<ol class="wl">${p.butiran.map((b: string) => `<li>${esc(b)}</li>`).join('')}</ol>` : esc(p.butiran)}</td>
      <td class="c">${esc(p.kuantiti)}</td>
      <td class="c">${esc(p.kualiti)}</td></tr>`).join('') || '<tr><td></td><td style="height:200px"></td><td></td><td></td></tr>';
  const bahan = (d.bahan && d.bahan.length ? d.bahan : [['', ''], ['', ''], ['', ''], ['', ''], ['', '']]);

  return `<!doctype html><html lang="ms"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#16181d;margin:0;font-size:9px}
  .page{width:210mm;margin:0 auto;padding:7mm;background:#fff}
  .frame{border:1.3px solid #000}
  .row{display:flex} .bb{border-bottom:1px solid #000} .br{border-right:1px solid #000}
  .head{display:flex;align-items:center;gap:10px;padding:2px 4px 8px}
  .head img{height:46px} .dept{font-size:9px} .ref{margin-left:auto;font-size:8px;color:#555;text-align:right}
  .tajuk{display:flex;border-bottom:1px solid #000}
  .tajuk .l{font-weight:700;padding:5px 6px;border-right:1px solid #000;white-space:nowrap}
  .tajuk .v{font-weight:700;padding:5px 6px;font-size:9px}
  .note{font-style:italic;font-size:7.5px;padding:2px 6px;border-bottom:1px solid #000}
  .title{display:flex;border-bottom:1px solid #000;align-items:stretch}
  .title .t{flex:1;background:#5a5f66;color:#fff;font:800 17px/1 Arial;font-style:italic;display:flex;align-items:center;padding:0 10px;letter-spacing:.5px}
  .title .dh{width:170px;border-left:1px solid #000;border-right:1px solid #000}
  .title .dh > div{padding:3px 6px} .title .dh .bb{border-bottom:1px solid #000}
  .title .bil{width:78px;display:flex;align-items:center;justify-content:center;font:800 15px/1 Arial}
  .hdr{background:#5a5f66;color:#fff;font:700 9px/1.1 Arial;padding:3px 6px;text-align:center}
  .lbl{font-weight:700;text-align:center;padding:3px 0}
  .ck{display:inline-flex;width:16px;height:12px;border:1px solid #000;margin:0 5px;vertical-align:middle;align-items:center;justify-content:center;color:#0a7a33}
  .bx{display:inline-block;min-width:30px;height:12px;border:1px solid #000;vertical-align:middle;text-align:center;line-height:12px;padding:0 3px}
  .skoprow{display:flex;align-items:center;padding:3px 6px}
  .trow{display:flex;align-items:center;padding:2px 6px;gap:4px} .trow .nm{flex:1;border-bottom:1px dotted #999}
  .grid3{display:grid;grid-template-columns:30% 30% 40%}
  .mid{display:grid;grid-template-columns:60% 40%}
  table.pl{border-collapse:collapse;width:100%} table.pl td{border:1px solid #000;padding:3px 4px;vertical-align:top;font-size:8.5px}
  table.pl .c{text-align:center;width:34px} table.pl thead td{background:#eee;font-weight:700;text-align:center}
  .wl{margin:0;padding-left:14px;line-height:1.4;font-size:8.5px}
  .jrow{display:flex;align-items:center;padding:2px 6px} .jrow > span:first-child{width:64px}
  .jrow .g{flex:1;display:flex;align-items:center;gap:4px}
  .bahan td{border:1px solid #000;height:13px;font-size:8px;padding:1px 4px} .bahan{border-collapse:collapse;width:100%}
  .box{padding:4px 6px;min-height:46px}
  .stat td{border:1px solid #000;padding:2px 4px;font-size:8px} .stat{border-collapse:collapse;width:100%}
  .sig{height:46px} .foot{font-size:7.5px;font-style:italic;padding:3px 2px}
  @media print{@page{size:A4;margin:5mm}.page{width:auto;margin:0;padding:5mm}}
  </style></head><body><div class="page">
  <div class="head"><img src="${logo}" alt="UTM"><div class="dept">Jabatan Timbalan Naib<br>Canselor (Pembangunan)</div><div class="ref">B-BPA/SP/LHTB<br>Pin. /2024</div></div>
  <div class="frame">
    <div class="tajuk"><div class="l">TAJUK KERJA :</div><div class="v">${esc(d.tajuk)}</div></div>
    <div class="note">'Site Diary' hendaklah diisi dengan lengkap setiap hari oleh Penyelia dan ditandatangani (dengan cap jawatan) setiap minggu oleh Pegawai Yang Bertanggungjawab</div>
    <div class="title">
      <div class="t">LAPORAN HARIAN TAPAK BINA</div>
      <div class="dh"><div class="bb"><b>TARIKH</b> : ${esc(d.tarikh)}</div><div><b>HARI</b> : ${esc(d.hari)}</div></div>
      <div class="bil">BIL: ${esc(d.bil)}</div>
    </div>
    <!-- upper: skop | cuaca | tenaga -->
    <div class="grid3 bb">
      <div class="br"><div class="lbl">SKOP KERJA</div>${SKOP.map((s) => `<div class="skoprow">${ck(skop[s])}${s}</div>`).join('')}</div>
      <div class="br"><div class="lbl">CUACA</div><div style="text-align:center;font-style:italic;font-size:7.5px">batalkan yang tidak berkenaan</div>
        <div class="skoprow">${ck(false)}pagi : ${cuaca(cu.pagi)}</div>
        <div class="skoprow">${ck(false)}petang : ${cuaca(cu.petang)}</div></div>
      <div><div class="lbl">TENAGA KERJA <span style="float:right;font-weight:400;font-size:7px">bil</span></div>
        ${tenaga.map(([n, b]: [string, string]) => `<div class="trow"><span class="nm">${esc(n)}</span>${bx(b)}</div>`).join('')}</div>
    </div>
    <!-- mid: perlaksanaan | jentera/bahan/pengurusan -->
    <div class="mid">
      <div class="br">
        <div class="hdr">PERLAKSANAAN KERJA KONTRAKTOR DI TAPAK</div>
        <table class="pl"><thead><tr><td>masa</td><td>butiran kerja kontraktor</td><td>kuantiti</td><td>*kualiti/<br>spek.</td></tr></thead><tbody>${perlak}</tbody></table>
      </div>
      <div>
        <div class="lbl bb">JENTERA / MESIN</div>
        ${JENTERA.map(([a, b]: [string, string]) => `<div class="jrow"><span>${a}</span>${bx(jv(a))}<span class="g">${b ? `${b} ${bx(jv(b))}` : '<span style="flex:1;border-bottom:1px dotted #999;height:12px"></span>' + bx('')}</span></div>`).join('')}
        <div class="lbl bb" style="border-top:1px solid #000">BAHAN BINAAN</div>
        <table class="bahan"><tr><td>bahan</td><td style="width:70px">bil dibekal</td></tr>${bahan.map(([a, b]: [string, string]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</table>
        <div class="lbl bb" style="border-top:1px solid #000">*PENGURUSAN TAPAK</div>
        <div class="skoprow">keselamatan ${ck(peng['keselamatan'])} &nbsp; kebersihan ${ck(peng['kebersihan'])}</div>
        <div class="skoprow">papan tanda ${ck(peng['papan tanda'])} &nbsp; pakaian kerja ${ck(peng['pakaian kerja'])}</div>
        <div class="skoprow">waktu kerja ${ck(peng['waktu kerja'])}</div>
      </div>
    </div>
    <!-- lower row 1 -->
    <div class="grid3 bb" style="border-top:1px solid #000">
      <div class="br"><div class="lbl bb">CATATAN PENYELIA</div><div class="box">${ol(d.catatan)}</div></div>
      <div class="br"><div class="lbl bb">ARAHAN KEPADA KONTRAKTOR</div><div class="box">${ol(d.arahan)}</div></div>
      <div><div class="lbl bb">UJIAN DI TAPAK <span style="font-weight:400;font-size:7px">(sekiranya ada/perlu)</span></div>
        <div class="row"><div class="br" style="flex:1;padding:3px 4px">keterangan ujian<br>${esc((d.ujian || {}).keterangan)}</div><div style="width:80px;padding:3px 4px">keputusan<br>${esc((d.ujian || {}).keputusan)}</div></div></div>
    </div>
    <!-- lower row 2 -->
    <div class="mid bb">
      <div class="br"><div class="lbl bb">PENYELARASAN BERSAMA PELANGGAN <span style="font-weight:400;font-size:7px">(sekiranya ada/perlu)</span></div><div class="box">${esc(d.penyelarasan)}</div></div>
      <div><div class="lbl bb">**STATUS KERJA</div>
        <table class="stat"><tr><td rowspan="2">peratus<br>kemajuan</td><td>rancang :</td><td>${esc(st.rancang)} %</td></tr><tr><td>sebenar :</td><td>${esc(st.sebenar)} %</td></tr>
        <tr><td rowspan="2">tempoh<br>bekerja</td><td>rancang :</td><td>${esc(st.tempohRancang)} hari</td></tr><tr><td>sebenar :</td><td>${esc(st.tempohSebenar)} hari</td></tr></table></div>
    </div>
    <!-- lower row 3 -->
    <div class="mid">
      <div class="br row">
        <div class="br" style="flex:1"><div class="lbl bb">PENYELIA</div><div class="sig"></div></div>
        <div style="flex:1"><div class="lbl bb">KONTRAKTOR</div><div class="sig"></div></div>
      </div>
      <div><div class="lbl bb">**KOMEN / ULASAN MINGGUAN <span style="font-weight:400;font-size:7px">(Pegawai Yang Bertanggungjawab)</span></div>
        <div class="box" style="min-height:40px">${esc(d.komen)}</div><div style="text-align:right;padding:0 6px 4px">Tandatangan</div></div>
    </div>
  </div>
  <div class="foot">* tandakan [ &#10003; ] ~ patuh ; [ X ] ~ tidak patuh ; ** pengisian secara mingguan oleh Pegawai Yang Bertanggungjawab</div>
  </div></body></html>`;
}
