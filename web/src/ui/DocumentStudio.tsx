import { useMemo, useState, ChangeEvent, CSSProperties } from 'react';
import { uploadDocumentHTML, saveArchivedDoc } from '../infrastructure/supabase/repositories';
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
const SK_DEFAULT = 'Pengarah Seksyen Kontrak & Perolehan\nFail';
const UNIT_DEFAULT = 'Seksyen Pembangunan\nBahagian Pengurusan Aset\nJabatan Timbalan Naib Canselor (Pembangunan)';
const Sec = ({ children }: { children: any }) => (
  <div style={{ fontWeight: 700, fontSize: 13, margin: '18px 0 8px', paddingTop: 12, borderTop: '1px solid #e6e0d8' }}>{children}</div>
);
const sBackdrop: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 10, zIndex: 1000, overflow: 'auto' };
const sModal: CSSProperties = { background: '#fff', borderRadius: 12, width: '100%', maxWidth: 920, margin: 'auto', boxShadow: '0 12px 48px rgba(0,0,0,.35)', display: 'flex', flexDirection: 'column', maxHeight: '96vh' };
const sHead: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #e6e0d8' };
const sActions: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid #e6e0d8' };
const sBody: CSSProperties = { overflow: 'auto', flex: 1, background: '#f2efe9' };
const sX: CSSProperties = { border: 0, background: 'transparent', fontSize: 24, lineHeight: 1, cursor: 'pointer', color: '#6b6560', padding: '0 6px' };

export function DocumentStudio({ projectId }: { projectId: string; onSaved?: () => void }) {
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
  const [projek, setProjek] = useState('');
  const [mTajuk, setMTajuk] = useState('');
  const [tuan, setTuan] = useState(true);
  const [namaTtd, setNamaTtd] = useState('');
  const [jawatanTtd, setJawatanTtd] = useState('Pengarah');
  const [unitTtd, setUnitTtd] = useState(UNIT_DEFAULT);
  const [emelTtd, setEmelTtd] = useState('');
  const [sk, setSk] = useState(SK_DEFAULT);

  // Laporan Bergambar (shared by memo + diary)
  const [lbDisiplin, setLbDisiplin] = useState('AWAM');
  const [lbTajukLajur, setLbTajukLajur] = useState('Gambar keadaan di tapak');
  const [entries, setEntries] = useState<LbEntry[]>([]);

  const [memoHtml, setMemoHtml] = useState('');
  const [editing, setEditing] = useState(false);
  const [showDoc, setShowDoc] = useState(false);

  // minit — header, attendance and signatures are user-entered; AI writes only the body
  const [mmTitle, setMmTitle] = useState('');
  const [mmTajuk, setMmTajuk] = useState('');
  const [mmNamaKon, setMmNamaKon] = useState('');
  const [mmNoSeb, setMmNoSeb] = useState('');
  const [mmTMulaISO, setMmTMulaISO] = useState('');
  const [mmTTamatISO, setMmTTamatISO] = useState('');
  const [mmTarikhISO, setMmTarikhISO] = useState('');
  const [mmMasa, setMmMasa] = useState('');
  const [mmTempat, setMmTempat] = useState('Bilik Mesyuarat, BPA');
  const [mmBil, setMmBil] = useState('');
  const [chair, setChair] = useState<{ nama: string; jawatan: string }[]>([{ nama: '', jawatan: 'Pengerusi Mesyuarat' }]);
  const [utmA, setUtmA] = useState<{ nama: string; jawatan: string; seksyen: string }[]>([{ nama: '', jawatan: '', seksyen: 'Seksyen Pembangunan' }]);
  const [konA, setKonA] = useState<{ nama: string; jawatan: string }[]>([{ nama: '', jawatan: '' }]);
  const [sigs, setSigs] = useState<{ peranan: string; nama: string; jawatan: string }[]>([
    { peranan: 'Disediakan oleh,', nama: '', jawatan: '' },
    { peranan: 'Disemak oleh,', nama: '', jawatan: '' },
    { peranan: 'Disahkan oleh,', nama: '', jawatan: '' },
    { peranan: 'Diluluskan oleh,', nama: '', jawatan: '' },
  ]);
  const [minitHtml, setMinitHtml] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const { tarikh, hari } = fromISO(tarikhISO);
  const selectedType = MEMO_TYPES.find((t) => t.id === memoType);
  const needsProgramme = (kind === 'memo' && selectedType?.needsProgramme) || kind === 'diary';
  const hasDoc = !!(diaryHtml || memoHtml || minitHtml || output);

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

  function setChairField(i: number, key: 'nama' | 'jawatan', v: string) { setChair((pr) => pr.map((r, idx) => (idx === i ? { ...r, [key]: v } : r))); }
  function setUtmField(i: number, key: 'nama' | 'jawatan' | 'seksyen', v: string) { setUtmA((pr) => pr.map((r, idx) => (idx === i ? { ...r, [key]: v } : r))); }
  function setKonField(i: number, key: 'nama' | 'jawatan', v: string) { setKonA((pr) => pr.map((r, idx) => (idx === i ? { ...r, [key]: v } : r))); }
  function setSigField(i: number, key: 'nama' | 'jawatan', v: string) { setSigs((pr) => pr.map((r, idx) => (idx === i ? { ...r, [key]: v } : r))); }

  async function onGenerate() {
    setBusy(true); setError(''); setOutput(''); setDiaryHtml(''); setMemoHtml(''); setMinitHtml(''); setEditing(false);
    try {
      const notes = { notes: story };
      if (kind === 'memo') {
        const { html } = await generateMemo(ports, {
          projectId, memoType, siteStory: notes, snapshot: snapshot ?? undefined,
          header: {
            bil: mBil, noRujukan, tarikh: fromISO(mTarikhISO).tarikh, daripada, kepada, projek, tajuk: mTajuk, tuan,
            namaTtd, jawatanTtd, unitTtd, emelTtd, sk,
            lbDisiplin, lbTajukLajur, photoEntries: entries.map((e) => ({ catatan: e.catatan, photos: e.photos })),
          },
        });
        setMemoHtml(html);
      } else if (kind === 'minit') {
        const pengerusi = chair.filter((c) => c.nama.trim()).map((c) => ({ nama: c.nama, jawatan: c.jawatan }));
        const utmGroups: { tajuk: string; ahli: { nama: string; jawatan: string }[] }[] = [];
        utmA.filter((a) => a.nama.trim()).forEach((a) => {
          const sec = a.seksyen.trim() || 'Pihak UTM';
          let g = utmGroups.find((x) => x.tajuk === sec);
          if (!g) { g = { tajuk: sec, ahli: [] }; utmGroups.push(g); }
          g.ahli.push({ nama: a.nama, jawatan: a.jawatan });
        });
        const kontraktor = konA.filter((k) => k.nama.trim()).map((k) => ({ nama: k.nama, jawatan: k.jawatan }));
        const tandatangan = sigs.filter((sg) => sg.nama.trim() || sg.jawatan.trim()).map((sg) => ({ peranan: sg.peranan, nama: sg.nama, jawatan: sg.jawatan }));
        const dot = mmTarikhISO ? mmTarikhISO.split('-').reverse().join('.') : '';
        const { html } = await generateMinit(ports, {
          projectId, notes,
          header: { title: mmTitle, tajuk: mmTajuk, namaKontraktor: mmNamaKon, noSebutharga: mmNoSeb, tarikhMula: fromISO(mmTMulaISO).tarikh, tarikhTamat: fromISO(mmTTamatISO).tarikh, tarikh: dot, masa: mmMasa, tempat: mmTempat, bil: mmBil },
          kehadiran: { pengerusi, utmGroups, kontraktor },
          tandatangan,
        });
        setMinitHtml(html);
      } else {
        const { html } = await generateSiteDiary(ports, { projectId, notes, header: { tajuk: tajukKerja, bil, tarikh, hari }, lb: lbPayload(), snapshot: snapshot ?? undefined });
        setDiaryHtml(html);
      }
      setShowDoc(true);
    } catch (err) { setError(err instanceof Error ? err.message : JSON.stringify(err)); }
    finally { setBusy(false); }
  }

  function toggleEdit() {
    const id = diaryHtml ? 'diaryFrame' : memoHtml ? 'memoFrame' : minitHtml ? 'minitFrame' : '';
    const f = id ? (document.getElementById(id) as HTMLIFrameElement | null) : null;
    const doc = f?.contentDocument;
    if (!doc) return;
    const on = !editing;
    doc.designMode = on ? 'on' : 'off';
    if (doc.body) doc.body.style.outline = on ? '2px dashed #7a0c2e' : '';
    setEditing(on);
  }

  function printFrame(id: string) {
    const f = document.getElementById(id) as HTMLIFrameElement | null;
    const doc = f?.contentDocument;
    if (doc) { doc.designMode = 'off'; if (doc.body) doc.body.style.outline = ''; }
    setEditing(false);
    f?.contentWindow?.focus();
    f?.contentWindow?.print();
  }

  // Export the document (including any inline edits) as a .doc that Word /
  // Pages / Google Docs can open and edit (add/remove rows, etc.).
  function saveAsWord(frameId: string, filename: string) {
    const f = document.getElementById(frameId) as HTMLIFrameElement | null;
    const doc = f?.contentDocument;
    if (!doc) return;
    doc.designMode = 'off';
    if (doc.body) doc.body.style.outline = '';
    setEditing(false);
    const ns = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>";
    const html = '<!doctype html>' + doc.documentElement.outerHTML.replace(/<html[^>]*>/i, ns);
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function saveToSystem() {
    const frameId = diaryHtml ? 'diaryFrame' : memoHtml ? 'memoFrame' : minitHtml ? 'minitFrame' : '';
    const activeHtml = diaryHtml || memoHtml || minitHtml;
    const activeKind = diaryHtml ? 'diary' : memoHtml ? 'memo' : 'minit';
    if (!frameId || !activeHtml) return;
    const f = document.getElementById(frameId) as HTMLIFrameElement | null;
    const doc = f?.contentDocument;
    const htmlContent = doc ? '<!doctype html>' + doc.documentElement.outerHTML : activeHtml;
    setSaveStatus('saving');
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const path = `${activeKind}/${ts}.html`;
      const publicUrl = await uploadDocumentHTML(htmlContent, path);
      const title = activeKind === 'diary'
        ? `Site Diary — ${tajukKerja} (${fromISO(tarikhISO).tarikh || ts.slice(0, 10)})`
        : activeKind === 'memo'
        ? `Memo — ${mTajuk || memoType} (${fromISO(mTarikhISO).tarikh || ts.slice(0, 10)})`
        : `Minit — ${mmTitle || mmTajuk} (${mmTarikhISO || ts.slice(0, 10)})`;
      await saveArchivedDoc({ title, kind: activeKind, html_path: path, public_url: publicUrl, project_name: tajukKerja || projek || mmTajuk });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
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

      {/* ---------- MINIT header + kehadiran ---------- */}
      {kind === 'minit' && (
        <>
          <Sec>Maklumat Mesyuarat (anda isi)</Sec>
          <div className="field"><label>Tajuk minit</label><input value={mmTitle} onChange={(e) => setMmTitle(e.target.value)} /></div>
          <div className="field"><label>Tajuk Kerja (projek)</label><textarea style={{ minHeight: 80 }} value={mmTajuk} onChange={(e) => setMmTajuk(e.target.value)} /></div>
          <div className="grid2">
            <div className="field"><label>Nama Kontraktor</label><input value={mmNamaKon} onChange={(e) => setMmNamaKon(e.target.value)} /></div>
            <div className="field"><label>No. Sebutharga</label><input value={mmNoSeb} onChange={(e) => setMmNoSeb(e.target.value)} /></div>
          </div>
          <div className="grid2">
            <div className="field"><label>Tarikh Mula Kerja</label><input type="date" value={mmTMulaISO} onChange={(e) => setMmTMulaISO(e.target.value)} /></div>
            <div className="field"><label>Tarikh Tamat Kerja</label><input type="date" value={mmTTamatISO} onChange={(e) => setMmTTamatISO(e.target.value)} /></div>
          </div>
          <div className="grid2">
            <div className="field"><label>Tarikh Mesyuarat</label><input type="date" value={mmTarikhISO} onChange={(e) => setMmTarikhISO(e.target.value)} /></div>
            <div className="field"><label>Masa</label><input value={mmMasa} onChange={(e) => setMmMasa(e.target.value)} /></div>
          </div>
          <div className="grid2">
            <div className="field"><label>Tempat</label><input value={mmTempat} onChange={(e) => setMmTempat(e.target.value)} /></div>
            <div className="field"><label>Bil. Mesyuarat</label><input value={mmBil} onChange={(e) => setMmBil(e.target.value)} /></div>
          </div>

          <Sec>Kehadiran — Pengerusi Mesyuarat</Sec>
          {chair.map((c, i) => (
            <div key={i} className="field" style={{ border: '1px solid #e6e0d8', borderRadius: 9, padding: 10 }}>
              <div className="grid2">
                <div className="field"><label>Nama</label><input value={c.nama} onChange={(e) => setChairField(i, 'nama', e.target.value)} /></div>
                <div className="field"><label>Jawatan</label><input value={c.jawatan} onChange={(e) => setChairField(i, 'jawatan', e.target.value)} /></div>
              </div>
              {chair.length > 1 && <button className="btn" style={{ padding: '4px 10px' }} onClick={() => setChair((pr) => pr.filter((_, idx) => idx !== i))}>Buang</button>}
            </div>
          ))}
          <div className="btn-row"><button className="btn" onClick={() => setChair((pr) => [...pr, { nama: '', jawatan: 'Pengerusi Mesyuarat' }])}>+ Tambah pengerusi</button></div>

          <Sec>Kehadiran — Pegawai UTM (nama · jawatan · seksyen)</Sec>
          {utmA.map((a, i) => (
            <div key={i} className="field" style={{ border: '1px solid #e6e0d8', borderRadius: 9, padding: 10 }}>
              <div className="grid2">
                <div className="field"><label>Nama</label><input value={a.nama} onChange={(e) => setUtmField(i, 'nama', e.target.value)} /></div>
                <div className="field"><label>Jawatan</label><input value={a.jawatan} onChange={(e) => setUtmField(i, 'jawatan', e.target.value)} /></div>
              </div>
              <div className="field"><label>Seksyen / Bahagian</label><input value={a.seksyen} onChange={(e) => setUtmField(i, 'seksyen', e.target.value)} /></div>
              {utmA.length > 1 && <button className="btn" style={{ padding: '4px 10px' }} onClick={() => setUtmA((pr) => pr.filter((_, idx) => idx !== i))}>Buang</button>}
            </div>
          ))}
          <div className="btn-row"><button className="btn" onClick={() => setUtmA((pr) => [...pr, { nama: '', jawatan: '', seksyen: 'Seksyen Pembangunan' }])}>+ Tambah pegawai</button></div>

          <Sec>Kehadiran — Kontraktor</Sec>
          {konA.map((k, i) => (
            <div key={i} className="field" style={{ border: '1px solid #e6e0d8', borderRadius: 9, padding: 10 }}>
              <div className="grid2">
                <div className="field"><label>Nama</label><input value={k.nama} onChange={(e) => setKonField(i, 'nama', e.target.value)} /></div>
                <div className="field"><label>Jawatan</label><input value={k.jawatan} onChange={(e) => setKonField(i, 'jawatan', e.target.value)} /></div>
              </div>
              {konA.length > 1 && <button className="btn" style={{ padding: '4px 10px' }} onClick={() => setKonA((pr) => pr.filter((_, idx) => idx !== i))}>Buang</button>}
            </div>
          ))}
          <div className="btn-row"><button className="btn" onClick={() => setKonA((pr) => [...pr, { nama: '', jawatan: '' }])}>+ Tambah wakil kontraktor</button></div>
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

      {/* ---------- MINIT signatures ---------- */}
      {kind === 'minit' && (
        <>
          <Sec>Tandatangan — nama &amp; jawatan</Sec>
          {sigs.map((sg, i) => (
            <div key={i} className="field" style={{ border: '1px solid #e6e0d8', borderRadius: 9, padding: 10 }}>
              <label>{sg.peranan}</label>
              <div className="grid2">
                <div className="field"><label>Nama</label><input value={sg.nama} onChange={(e) => setSigField(i, 'nama', e.target.value)} /></div>
                <div className="field"><label>Jawatan</label><input value={sg.jawatan} onChange={(e) => setSigField(i, 'jawatan', e.target.value)} /></div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ---------- MEMO signature ---------- */}
      {kind === 'memo' && (
        <>
          <Sec>Tandatangan &amp; Salinan (anda isi)</Sec>
          <div className="grid2">
            <div className="field"><label>Nama penandatangan</label><input value={namaTtd} onChange={(e) => setNamaTtd(e.target.value)} /></div>
            <div className="field"><label>Jawatan</label><input value={jawatanTtd} onChange={(e) => setJawatanTtd(e.target.value)} /></div>
          </div>
          <div className="field"><label>Unit / Bahagian (kekal)</label><textarea style={{ minHeight: 64 }} value={unitTtd} onChange={(e) => setUnitTtd(e.target.value)} /></div>
          <div className="field"><label>Emel</label><input value={emelTtd} onChange={(e) => setEmelTtd(e.target.value)} /></div>
          <div className="field"><label>s.k. (salinan kepada)</label><textarea style={{ minHeight: 60 }} value={sk} onChange={(e) => setSk(e.target.value)} /></div>
        </>
      )}

      <div className="btn-row">
        <button className="btn btn-primary" onClick={onGenerate} disabled={busy || !story}>{busy ? 'Menjana… (backend mungkin sedang bangun ~30s)' : 'Jana Dokumen'}</button>
        {hasDoc && !showDoc && <button className="btn" onClick={() => setShowDoc(true)}>Buka dokumen</button>}
      </div>

      {error && <div className="err">{error}</div>}

      {/* ---------- Generated document: popup ---------- */}
      {showDoc && hasDoc && (
        <div style={sBackdrop} onClick={() => setShowDoc(false)}>
          <div style={sModal} onClick={(e) => e.stopPropagation()}>
            <div style={sHead}>
              <div style={{ fontWeight: 700, fontFamily: 'Sora, sans-serif' }}>Dokumen Dijana</div>
              <button style={sX} onClick={() => setShowDoc(false)} aria-label="Tutup">×</button>
            </div>
            <div style={sActions}>
              {(diaryHtml || memoHtml || minitHtml) && <button className="btn" onClick={toggleEdit}>{editing ? 'Selesai Edit' : 'Edit'}</button>}
              {diaryHtml && <button className="btn btn-primary" onClick={() => printFrame('diaryFrame')}>Cetak / Simpan PDF</button>}
              {diaryHtml && <button className="btn" onClick={() => saveAsWord('diaryFrame', 'site-diary.doc')}>Simpan ke Word</button>}
              {memoHtml && <button className="btn btn-primary" onClick={() => printFrame('memoFrame')}>Cetak / Simpan PDF</button>}
              {memoHtml && <button className="btn" onClick={() => saveAsWord('memoFrame', 'memo.doc')}>Simpan ke Word</button>}
              {minitHtml && <button className="btn btn-primary" onClick={() => printFrame('minitFrame')}>Cetak / Simpan PDF</button>}
              {minitHtml && <button className="btn" onClick={() => saveAsWord('minitFrame', 'minit-mesyuarat.doc')}>Simpan ke Word</button>}
              {output && <button className="btn" onClick={() => navigator.clipboard?.writeText(output)}>Salin Teks</button>}
              {(diaryHtml || memoHtml || minitHtml) && (
                <button
                  className="btn"
                  onClick={saveToSystem}
                  disabled={saveStatus === 'saving'}
                  style={{ background: saveStatus === 'saved' ? '#ecfdf5' : saveStatus === 'error' ? '#fdecec' : '#fff', borderColor: saveStatus === 'saved' ? '#a7f3d0' : saveStatus === 'error' ? '#f6c9c9' : 'var(--line)', color: saveStatus === 'saved' ? '#1a6e3c' : saveStatus === 'error' ? '#b00020' : 'var(--ink)' }}
                >
                  {saveStatus === 'saving' ? '⏳ Menyimpan…' : saveStatus === 'saved' ? '✓ Tersimpan!' : saveStatus === 'error' ? '✗ Gagal' : '💾 Simpan ke Sistem'}
                </button>
              )}
            </div>
            <div style={sBody}>
              {diaryHtml && <iframe id="diaryFrame" title="diary" srcDoc={diaryHtml} style={{ width: '100%', height: 1400, border: 0, background: '#fff' }} />}
              {memoHtml && <iframe id="memoFrame" title="memo" srcDoc={memoHtml} style={{ width: '100%', height: 1400, border: 0, background: '#fff' }} />}
              {minitHtml && <iframe id="minitFrame" title="minit" srcDoc={minitHtml} style={{ width: '100%', height: 1400, border: 0, background: '#fff' }} />}
              {output && <div className="output" style={{ margin: 14 }}>{output}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}