import { useMemo, useState, ChangeEvent } from 'react';
import { MEMO_TYPES } from '../domain/memoTypes';
import { ProgrammeSnapshot } from '../domain/entities';
import { buildPorts } from '../composition';
import { generateMemo, generateMinit, generateSiteDiary, parseProgramme } from '../application/useCases';

type Kind = 'diary' | 'memo' | 'minit';
type Photo = { name: string; dataUrl: string };
const HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
function fromISO(iso: string) {
  if (!iso) return { tarikh: '', hari: '' };
  const d = new Date(iso + 'T00:00:00');
  return { tarikh: `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`, hari: HARI[d.getDay()] };
}
const escHtml = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as Record<string, string>)[c]);
function buildPhotoReport(photos: Photo[], tajuk: string): string {
  const cells = photos.map((p, i) => `<figure><img src="${p.dataUrl}"/><figcaption>Gambar ${i + 1}${p.name ? ' &mdash; ' + escHtml(p.name) : ''}</figcaption></figure>`).join('');
  return `<!doctype html><html lang="ms"><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;margin:0;padding:10mm;color:#1d1b1a}
    h1{font-size:15px;text-align:center;margin:0 0 2px} .sub{text-align:center;font-size:10px;margin-bottom:10px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    figure{margin:0;border:1px solid #888;padding:5px} figure img{width:100%;height:auto;display:block}
    figcaption{font-size:10px;text-align:center;padding-top:4px}
    @media print{@page{size:A4;margin:8mm}}
  </style></head><body><h1>LAPORAN BERGAMBAR</h1><div class="sub">${escHtml(tajuk || '')}</div><div class="grid">${cells}</div></body></html>`;
}

export function DocumentStudio({ projectId }: { projectId: string }) {
  const ports = useMemo(() => buildPorts(), []);
  const [kind, setKind] = useState<Kind>('diary');
  const [memoType, setMemoType] = useState(MEMO_TYPES[0].id);
  const [story, setStory] = useState('');
  const [tajuk, setTajuk] = useState('Bumbung Akademik - Pakej 2');
  const [bil, setBil] = useState('');
  const [tarikhISO, setTarikhISO] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoHtml, setPhotoHtml] = useState('');
  const [snapshot, setSnapshot] = useState<ProgrammeSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState('');
  const [diaryHtml, setDiaryHtml] = useState('');
  const [error, setError] = useState('');

  const { tarikh, hari } = fromISO(tarikhISO);
  const selectedType = MEMO_TYPES.find((t) => t.id === memoType);
  const needsProgramme = (kind === 'memo' && selectedType?.needsProgramme) || kind === 'diary';

  async function onMpp(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError('');
    try { setSnapshot(await parseProgramme(ports, file)); }
    catch (err) { setError(err instanceof Error ? err.message : JSON.stringify(err)); }
    finally { setBusy(false); }
  }

  function onPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    Promise.all(files.map((f) => new Promise<Photo>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve({ name: f.name, dataUrl: String(r.result) });
      r.readAsDataURL(f);
    }))).then((loaded) => setPhotos((prev) => [...prev, ...loaded]));
  }

  async function onGenerate() {
    setBusy(true); setError(''); setOutput(''); setDiaryHtml(''); setPhotoHtml('');
    try {
      const notes = { notes: story };
      if (kind === 'memo') {
        const doc = await generateMemo(ports, { projectId, memoType, siteStory: notes, snapshot: snapshot ?? undefined });
        setOutput(doc.body);
        if (photos.length) setPhotoHtml(buildPhotoReport(photos, tajuk));
      } else if (kind === 'minit') {
        const doc = await generateMinit(ports, { projectId, points: notes });
        setOutput(doc.body);
      } else {
        const { html } = await generateSiteDiary(ports, { projectId, notes, header: { tajuk, bil, tarikh, hari }, snapshot: snapshot ?? undefined });
        setDiaryHtml(html);
      }
    } catch (err) { setError(err instanceof Error ? err.message : JSON.stringify(err)); }
    finally { setBusy(false); }
  }

  function printFrame(id: string) {
    const f = document.getElementById(id) as HTMLIFrameElement | null;
    f?.contentWindow?.focus();
    f?.contentWindow?.print();
  }

  return (
    <div className="card">
      <h2>Jana Dokumen</h2>
      <p className="lead">Pilih jenis dokumen, isi maklumat, dan jana. Header rasmi &amp; No. Rujukan kekal pada templat anda.</p>

      <div className="field">
        <div className="seg">
          <button className={kind === 'diary' ? 'active' : ''} onClick={() => setKind('diary')}>Site Diary</button>
          <button className={kind === 'memo' ? 'active' : ''} onClick={() => setKind('memo')}>Memo</button>
          <button className={kind === 'minit' ? 'active' : ''} onClick={() => setKind('minit')}>Minit</button>
        </div>
      </div>

      {kind === 'memo' && (
        <>
          <div className="field"><label>Jenis Memo</label>
            <select value={memoType} onChange={(e) => setMemoType(e.target.value)}>
              {MEMO_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            {selectedType && <p className="hint">Perlu: {selectedType.factHints.join(' · ')}</p>}
          </div>
          <div className="field"><label>Gambar (Laporan Bergambar) — opsyenal</label>
            <input type="file" accept="image/*" multiple onChange={onPhotos} />
            {photos.length > 0 && <p className="hint">{photos.length} gambar dipilih. <button className="btn" style={{ padding: '2px 8px', marginLeft: 6 }} onClick={() => setPhotos([])}>Kosongkan</button></p>}
          </div>
        </>
      )}

      {kind === 'diary' && (
        <>
          <div className="field"><label>Tajuk Kerja</label>
            <input value={tajuk} onChange={(e) => setTajuk(e.target.value)} placeholder="cth Bumbung Akademik - Pakej 2" /></div>
          <div className="grid2">
            <div className="field"><label>Tarikh</label>
              <input type="date" value={tarikhISO} onChange={(e) => setTarikhISO(e.target.value)} /></div>
            <div className="field"><label>Hari (auto)</label>
              <input value={hari} readOnly placeholder="—" /></div>
          </div>
          <div className="field"><label>Bil (No. laporan)</label>
            <input value={bil} onChange={(e) => setBil(e.target.value)} placeholder="cth 12" /></div>
        </>
      )}

      {needsProgramme && (
        <div className="field"><label>Programme (.mpp) — opsyenal, untuk status %</label>
          <input type="file" accept=".mpp" onChange={onMpp} />
          {snapshot && <p className="hint">✓ Dibaca — sebenar {snapshot.overall.actual}% / rancang {snapshot.overall.plan}%</p>}
        </div>
      )}

      <div className="field"><label>{kind === 'diary' ? 'Nota harian (aktiviti, pekerja, isu…)' : 'Site story / poin mesyuarat'}</label>
        <textarea value={story} onChange={(e) => setStory(e.target.value)} placeholder="Tulis nota mentah anda di sini…" /></div>

      <div className="btn-row">
        <button className="btn btn-primary" onClick={onGenerate} disabled={busy || !story}>{busy ? 'Menjana… (backend mungkin sedang bangun ~30s)' : 'Jana Dokumen'}</button>
        {diaryHtml && <button className="btn" onClick={() => printFrame('diaryFrame')}>Cetak / Simpan PDF</button>}
        {photoHtml && <button className="btn" onClick={() => printFrame('photoFrame')}>Cetak Laporan Bergambar</button>}
        {output && <button className="btn" onClick={() => navigator.clipboard?.writeText(output)}>Salin Teks</button>}
      </div>

      {error && <div className="err">{error}</div>}
      {output && <div className="output">{output}</div>}
      {diaryHtml && <div className="frame-wrap"><iframe id="diaryFrame" title="diary" srcDoc={diaryHtml} style={{ width: '100%', height: 1000, border: 0 }} /></div>}
      {photoHtml && <div className="frame-wrap"><iframe id="photoFrame" title="laporan" srcDoc={photoHtml} style={{ width: '100%', height: 520, border: 0 }} /></div>}
    </div>
  );
}
