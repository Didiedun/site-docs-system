import { useMemo, useState, ChangeEvent } from 'react';
import { MEMO_TYPES } from '../domain/memoTypes';
import { ProgrammeSnapshot } from '../domain/entities';
import { buildPorts } from '../composition';
import { generateMemo, generateMinit, generateSiteDiary, parseProgramme } from '../application/useCases';

type Kind = 'diary' | 'memo' | 'minit';
type Photo = { name: string; dataUrl: string };
type LbEntry = { id: number; catatan: string; photos: Photo[] };
const HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
function fromISO(iso: string) {
  if (!iso) return { tarikh: '', hari: '' };
  const d = new Date(iso + 'T00:00:00');
  return { tarikh: `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`, hari: HARI[d.getDay()] };
}
const PROJEK_DEFAULT =
  'UTM-PEMBAIKAN & PENGGANTIAN KEMASAN DAN KELENGKAPAN BUMBUNG KOLEJ KEDIAMAN DAN BANGUNAN AKADEMIK DI KAMPUS UTM JOHOR BAHRU, JOHOR\nPAKEJ 2 : BANGUNAN AKADEMIK & BANGUNAN SOKONGAN FAKULTI KEJURUTERAAN ELEKTRIK DAN FAKULTI KEJURUTERAAN KIMIA & KEJURUTERAAN TENAGA';
const SK_DEFAULT = 'Pengarah Seksyen Kontrak & Perolehan\nFail';
const Sec = ({ children }: { children: any }) => (
  <div style={{ fontWeight: 700, fontSize: 13, margin: '18px 0 8px', paddingTop: 12, borderTop: '1px solid #e6e0d8' }}>{children}</div>
);

export function DocumentStudio({ projectId }: { projectId: string }) {
  const ports = useMemo(() => buildPorts(), []);
  const [kind, setKind] = useState<Kind>('diary');
  const [story, setStory] = useState('');
  const [snapshot, setSnapshot] = useState<ProgrammeSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [output, setOutput] = useState('');

  // diary
  const [tajukKerja, setTajukKerja] = useState('Bumbung Akademik - Pakej 2');
  const [bil, setBil] = useState('');
  const [tarikhISO, setTarikhISO] = useState('');
  const [diaryHtml, setDiaryHtml] = useState('');

  // memo header (all user-entered — never generated)
  const [memoType, setMemoType] = useState(MEMO_TYPES[0].id);
  const [mBil, setMBil] = useState('');
  const [noRujukan, setNoRujukan] = useState('');
  const [mTarikhISO, setMTarikhISO] = useState('');
  const [daripada, setDaripada] = useState('PENGARAH SEKSYEN PEMBANGUNAN');
  const [kepada, setKepada] = useState('');
  const [projek, setProjek] = useState(PROJEK_DEFAULT);
  const [mTajuk, setMTajuk] = useState('');
  const [tuan, setTuan] = useState(true);
  const [namaTtd, setNamaTtd] = useState('');
  const [jawatanTtd, setJawatanTtd] = useState('');
  const [sk, setSk] = useState(SK_DEFAULT);

  // Laporan Bergambar (shared by memo + diary)
  const [lbDisiplin, setLbDisiplin] = useState('AWAM');
  const [lbTajukLajur, setLbTajukLajur] = useState('Gambar keadaan di tapak');
  const [entries, setEntries] = useState<LbEntry[]>([]);

  const [memoHtml, setMemoHtml] = useState('');

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

  function addEntry() { setEntries((p) => [...p, { id: Date.now(), catatan: '', photos: [] }]); }
  function removeEntry(id: number) { setEntries((p) => p.filter((e) => e.id !== id)); }
  function setEntryCatatan(id: number, v: string) { setEntries((p) => p.map((e) => (e.id === id ? { ...e, catatan: v } : e))); }
  function addEntryPhotos(id: number, ev: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(ev.target.files || []);
    Promise.all(files.map((f) => new Promise<Photo>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve({ name: f.name, dataUrl: String(r.result) });
      r.readAsDataURL(f);
    }))).then((loaded) => setEntries((p) => p.map((e) => (e.id === id ? { ...e, photos: [...e.photos, ...loaded] } : e))));
  }

  const lbPayload = () => ({ entries: entries.map((e) => ({ catatan: e.catatan, photos: e.photos })), disiplin: lbDisiplin, tajukLajur: lbTajukLajur });

  async function onGenerate() {
    setBusy(true); setError(''); setOutput(''); setDiaryHtml(''); setMemoHtml('');
    try {
      const notes = { notes: story };
      if (kind === 'memo') {
        const { html } = await generateMemo(ports, {
          projectId, memoType, siteStory: notes, snapshot: snapshot ?? undefined,
          header: {
            bil: mBil, noRujukan, tarikh: fromISO(mTarikhISO).tarikh, daripada, kepada, projek, tajuk: mTajuk, tuan,
            namaTtd, jawatanTtd, sk,
            lbDisiplin, lbTajukLajur, photoEntries: entries.map((e) => ({ catatan: e.catatan, photos: e.photos })),
          },
        });
        setMemoHtml(html);
      } else if (kind === 'minit') {
        const doc = await generateMinit(ports, { projectId, points: notes });
        setOutput(doc.body);
      } else {
        const { html } = await generateSiteDiary(ports, { projectId, notes, header: { tajuk: tajukKerja, bil, tarikh, hari }, lb: lbPayload(), snapshot: snapshot ?? undefined });
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
      <p className="lead">Maklumat rasmi (No. Rujukan, Bil, tarikh, nama, kapsyen gambar) anda isi sendiri — AI tulis badan &amp; jadual sahaja, dan tidak mereka nombor/tarikh.</p>

      <div className="field">
        <div className="seg">
          <button className={kind === 'diary' ? 'active' : ''} onClick={() => setKind('diary')}>Site Diary</button>
          <button className={kind === 'memo' ? 'active' : ''} onClick={() => setKind('memo')}>Memo</button>
          <button className={kind === 'minit' ? 'active' : ''} onClick={() => setKind('minit')}>Minit</button>
        </div>
      </div>

      {/* ---------- MEMO header ---------- */}
      {kind === 'memo' && (
        <>
          <div className="field"><label>Jenis Memo</label>
            <select value={memoType} onChange={(e) => setMemoType(e.target.value)}>
              {MEMO_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            {selectedType && <p className="hint">Perlu: {selectedType.factHints.join(' · ')}</p>}
          </div>
          <Sec>Maklumat Memo (anda isi)</Sec>
          <div className="grid2">
            <div className="field"><label>Memo Bil.</label><input value={mBil} onChange={(e) => setMBil(e.target.value)} /></div>
            <div className="field"><label>Tarikh</label><input type="date" value={mTarikhISO} onChange={(e) => setMTarikhISO(e.target.value)} /></div>
          </div>
          <div className="field"><label>No. Rujukan</label><input value={noRujukan} onChange={(e) => setNoRujukan(e.target.value)} /></div>
          <div className="field"><label>Daripada</label><input value={daripada} onChange={(e) => setDaripada(e.target.value)} /></div>
          <div className="field"><label>Kepada</label><textarea style={{ minHeight: 70 }} value={kepada} onChange={(e) => setKepada(e.target.value)} /></div>
          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input id="tuan" type="checkbox" checked={tuan} onChange={(e) => setTuan(e.target.checked)} style={{ width: 'auto' }} /><label htmlFor="tuan" style={{ margin: 0 }}>Papar &ldquo;Tuan,&rdquo; (memo kepada kontraktor)</label></div>
          <div className="field"><label>Projek</label><textarea style={{ minHeight: 90 }} value={projek} onChange={(e) => setProjek(e.target.value)} /></div>
          <div className="field"><label>Tajuk memo (baris selepas PROJEK)</label><input value={mTajuk} onChange={(e) => setMTajuk(e.target.value)} /></div>
        </>
      )}

      {/* ---------- DIARY fields ---------- */}
      {kind === 'diary' && (
        <>
          <div className="field"><label>Tajuk Kerja</label>
            <input value={tajukKerja} onChange={(e) => setTajukKerja(e.target.value)} /></div>
          <div className="grid2">
            <div className="field"><label>Tarikh</label>
              <input type="date" value={tarikhISO} onChange={(e) => setTarikhISO(e.target.value)} /></div>
            <div className="field"><label>Hari (auto)</label>
              <input value={hari} readOnly /></div>
          </div>
          <div className="field"><label>Bil (No. laporan)</label>
            <input value={bil} onChange={(e) => setBil(e.target.value)} /></div>
        </>
      )}

      {needsProgramme && (
        <div className="field"><label>Programme (.mpp) — opsyenal, untuk status %</label>
          <input type="file" accept=".mpp" onChange={onMpp} />
          {snapshot && <p className="hint">✓ Dibaca — sebenar {snapshot.overall.actual}% / rancang {snapshot.overall.plan}%</p>}
        </div>
      )}

      {kind === 'memo' && <Sec>Isi Memo (AI draf daripada nota anda)</Sec>}
      <div className="field"><label>{kind === 'diary' ? 'Nota harian (aktiviti, pekerja, isu…)' : kind === 'memo' ? 'Nota / fakta (tulis nombor, tarikh, RM tepat di sini)' : 'Poin mesyuarat'}</label>
        <textarea value={story} onChange={(e) => setStory(e.target.value)} /></div>

      {/* ---------- Laporan Bergambar (memo + diary) ---------- */}
      {kind !== 'minit' && (
        <>
          <Sec>Laporan Bergambar — jadual (opsyenal, muka surat berasingan)</Sec>
          <div className="grid2">
            <div className="field"><label>Disiplin (jalur tajuk)</label><input value={lbDisiplin} onChange={(e) => setLbDisiplin(e.target.value)} /></div>
            <div className="field"><label>Tajuk lajur gambar</label><input value={lbTajukLajur} onChange={(e) => setLbTajukLajur(e.target.value)} /></div>
          </div>
          {entries.map((e, idx) => (
            <div key={e.id} className="field" style={{ border: '1px solid #e6e0d8', borderRadius: 9, padding: 10 }}>
              <label>Baris {idx + 1}</label>
              <input type="file" accept="image/*" multiple onChange={(ev) => addEntryPhotos(e.id, ev)} />
              {e.photos.length > 0 && <p className="hint">{e.photos.length} gambar</p>}
              <textarea style={{ minHeight: 56, marginTop: 6 }} value={e.catatan} onChange={(ev) => setEntryCatatan(e.id, ev.target.value)} />
              <button className="btn" style={{ padding: '4px 10px', marginTop: 6 }} onClick={() => removeEntry(e.id)}>Buang baris</button>
            </div>
          ))}
          <div className="btn-row"><button className="btn" onClick={addEntry}>+ Tambah baris gambar</button></div>
        </>
      )}

      {/* ---------- MEMO signature ---------- */}
      {kind === 'memo' && (
        <>
          <Sec>Tandatangan &amp; Salinan (anda isi)</Sec>
          <div className="grid2">
            <div className="field"><label>Nama penandatangan</label><input value={namaTtd} onChange={(e) => setNamaTtd(e.target.value)} /></div>
            <div className="field"><label>Jawatan</label><textarea style={{ minHeight: 70 }} value={jawatanTtd} onChange={(e) => setJawatanTtd(e.target.value)} /></div>
          </div>
          <div className="field"><label>s.k. (salinan kepada)</label><textarea style={{ minHeight: 60 }} value={sk} onChange={(e) => setSk(e.target.value)} /></div>
        </>
      )}

      <div className="btn-row">
        <button className="btn btn-primary" onClick={onGenerate} disabled={busy || !story}>{busy ? 'Menjana… (backend mungkin sedang bangun ~30s)' : 'Jana Dokumen'}</button>
        {diaryHtml && <button className="btn" onClick={() => printFrame('diaryFrame')}>Cetak / Simpan PDF</button>}
        {memoHtml && <button className="btn" onClick={() => printFrame('memoFrame')}>Cetak / Simpan PDF</button>}
        {output && <button className="btn" onClick={() => navigator.clipboard?.writeText(output)}>Salin Teks</button>}
      </div>

      {error && <div className="err">{error}</div>}
      {output && <div className="output">{output}</div>}
      {diaryHtml && <div className="frame-wrap"><iframe id="diaryFrame" title="diary" srcDoc={diaryHtml} style={{ width: '100%', height: 1000, border: 0 }} /></div>}
      {memoHtml && <div className="frame-wrap"><iframe id="memoFrame" title="memo" srcDoc={memoHtml} style={{ width: '100%', height: 1100, border: 0 }} /></div>}
    </div>
  );
}
