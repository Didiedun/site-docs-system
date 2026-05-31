import { useMemo, useState, ChangeEvent } from 'react';
import { MEMO_TYPES } from '../domain/memoTypes';
import { ProgrammeSnapshot } from '../domain/entities';
import { buildPorts } from '../composition';
import { generateMemo, generateMinit, generateSiteDiary, parseProgramme } from '../application/useCases';

type Kind = 'memo' | 'minit' | 'diary';

export function DocumentStudio({ projectId }: { projectId: string }) {
  const ports = useMemo(() => buildPorts(), []);
  const [kind, setKind] = useState<Kind>('diary');
  const [memoType, setMemoType] = useState(MEMO_TYPES[0].id);
  const [story, setStory] = useState('');
  const [tajuk, setTajuk] = useState('Bumbung Akademik - Pakej 2');
  const [bil, setBil] = useState('');
  const [snapshot, setSnapshot] = useState<ProgrammeSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState('');
  const [diaryHtml, setDiaryHtml] = useState('');
  const [error, setError] = useState('');

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

  async function onGenerate() {
    setBusy(true); setError(''); setOutput(''); setDiaryHtml('');
    try {
      const notes = { notes: story };
      if (kind === 'memo') {
        const doc = await generateMemo(ports, { projectId, memoType, siteStory: notes, snapshot: snapshot ?? undefined });
        setOutput(doc.body);
      } else if (kind === 'minit') {
        const doc = await generateMinit(ports, { projectId, points: notes });
        setOutput(doc.body);
      } else {
        const { html } = await generateSiteDiary(ports, { projectId, notes, header: { tajuk, bil }, snapshot: snapshot ?? undefined });
        setDiaryHtml(html);
      }
    } catch (err) { setError(err instanceof Error ? err.message : JSON.stringify(err)); }
    finally { setBusy(false); }
  }

  const box: React.CSSProperties = { border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 16 };
  const field: React.CSSProperties = { width: '100%', padding: 6, marginTop: 4, marginBottom: 8 };

  return (
    <div style={box}>
      <label>Dokumen:&nbsp;
        <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          <option value="diary">Site Diary</option>
          <option value="memo">Memo</option>
          <option value="minit">Minit Mesyuarat</option>
        </select>
      </label>
      {kind === 'memo' && (
        <label>&nbsp;&nbsp;Jenis:&nbsp;
          <select value={memoType} onChange={(e) => setMemoType(e.target.value)}>
            {MEMO_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
      )}
      {kind === 'diary' && (
        <div style={{ marginTop: 12 }}>
          <label>Tajuk Kerja</label>
          <input value={tajuk} onChange={(e) => setTajuk(e.target.value)} style={field} placeholder="cth Bumbung Akademik - Pakej 2" />
          <label>Bil (No. laporan)</label>
          <input value={bil} onChange={(e) => setBil(e.target.value)} style={field} placeholder="cth 12" />
        </div>
      )}
      {selectedType && kind === 'memo' && (
        <p style={{ color: '#777', fontSize: 13 }}>Perlu: {selectedType.factHints.join(' · ')}</p>
      )}
      {needsProgramme && (
        <p><input type="file" accept=".mpp" onChange={onMpp} /> {snapshot && `✓ .mpp parsed — ${snapshot.overall.actual}% / rancang ${snapshot.overall.plan}%`}</p>
      )}
      <label>{kind === 'diary' ? 'Nota harian (aktiviti, pekerja, isu…)' : 'Site story / poin mesyuarat'}</label>
      <textarea value={story} onChange={(e) => setStory(e.target.value)} rows={9}
        placeholder="Tulis nota mentah anda di sini…" style={{ width: '100%', marginTop: 4 }} />
      <div style={{ marginTop: 8 }}>
        <button onClick={onGenerate} disabled={busy || !story}>{busy ? 'Menjana…' : 'Jana'}</button>
      </div>
      {error && <pre style={{ color: '#b00', whiteSpace: 'pre-wrap' }}>{error}</pre>}
      {output && <pre style={{ whiteSpace: 'pre-wrap', ...box }}>{output}</pre>}
      {diaryHtml && (
        <iframe title="diary" srcDoc={diaryHtml} style={{ width: '100%', height: 1000, border: '1px solid #ccc', marginTop: 16 }} />
      )}
    </div>
  );
}
