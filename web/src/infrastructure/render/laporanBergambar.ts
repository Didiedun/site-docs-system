// Shared "Laporan Bergambar" table (No | photos | Tindakan/Catatan) on its own
// page. Used by both the memo and the site-diary renderers so they stay in sync.
type Dict = Record<string, any>;
const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as Dict)[c]);
const br = (s: any) => esc(s).replace(/\n/g, '<br>');

export function renderLaporanBergambar(
  entries: Dict[] | undefined,
  opts: { projek?: string; disiplin?: string; tajukLajur?: string } = {},
): string {
  if (!entries || !entries.length) return '';
  const dis = opts.disiplin || 'AWAM';
  const col = opts.tajukLajur || 'Gambar keadaan di tapak';
  const rows = entries.map((e, i) => {
    const imgs = e.photos || [];
    const w = imgs.length > 1 ? '48%' : '72%';
    const cells = imgs.map((p: Dict) => `<img style="max-width:${w}" src="${p.dataUrl}"/>`).join('');
    return `<tr><td class="lbno">${i + 1}</td><td class="lbphotos">${cells}</td><td class="lbact">${br(e.catatan)}</td></tr>`;
  }).join('');
  return `<div class="lbpage">
    <div class="lbh">LAPORAN BERGAMBAR</div>
    <div class="lbproj">${br(opts.projek || '')}</div>
    <table class="lbt">
      <tr><td class="lbdis" colspan="3">${esc(dis)}</td></tr>
      <tr class="lbhdr"><td class="lbno">No</td><td>${esc(col)}</td><td class="lbact">Tindakan/ Catatan</td></tr>
      ${rows}
    </table>
  </div>`;
}

export const LB_CSS = `
  .lbpage{page-break-before:always}
  .lbh{border:1px solid #1b1b1b;background:#e9e9e9;text-align:center;font-weight:700;padding:3px;font-size:11px;font-family:Arial,Helvetica,sans-serif}
  .lbproj{border:1px solid #1b1b1b;border-top:0;font-weight:700;font-size:9.5px;padding:5px 7px;line-height:1.3;font-family:Arial,Helvetica,sans-serif}
  table.lbt{border-collapse:collapse;width:100%;font-family:Arial,Helvetica,sans-serif}
  table.lbt td{border:1px solid #1b1b1b;padding:5px;vertical-align:top;font-size:10px}
  .lbdis{background:#dfe3e6;text-align:center;font-weight:700}
  .lbhdr td{background:#fff;font-weight:700;text-align:center;vertical-align:middle}
  .lbno{width:28px;text-align:center;font-weight:700;vertical-align:top}
  .lbact{width:150px;text-align:center;vertical-align:middle}
  .lbphotos{text-align:center} .lbphotos img{height:auto;display:inline-block;margin:3px;vertical-align:top;border:1px solid #ccc}
  @media screen{.lbpage{border-top:10px dashed #ccc;margin-top:26px}}`;
