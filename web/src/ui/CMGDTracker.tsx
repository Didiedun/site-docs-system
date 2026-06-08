import { useEffect, useState } from 'react';
import { listCMGD, saveCMGD, deleteCMGD, cmgdStatus, type CMGDItem } from '../infrastructure/supabase/repositories';

const STATUS_COLOR: Record<string, string> = {
  overdue: '#b00020',
  due_soon: '#b45309',
  active: '#1a6e3c',
  issued: '#555',
};
const STATUS_BG: Record<string, string> = {
  overdue: '#fdecec',
  due_soon: '#fef3c7',
  active: '#ecfdf5',
  issued: '#f3f4f6',
};
const STATUS_LABEL: Record<string, string> = {
  overdue: 'Tamat Tempoh',
  due_soon: 'Hampir Tamat (≤30 hari)',
  active: 'Aktif',
  issued: 'CMGD Dikeluarkan',
};

const BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogs', 'Sep', 'Okt', 'Nov', 'Dis'];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}
function daysUntil(dateStr: string) {
  const d = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  if (d < 0) return `${Math.abs(d)} hari telah lepas`;
  if (d === 0) return 'Hari ini';
  return `${d} hari lagi`;
}
function addMonths(iso: string, months: number): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

const EMPTY: CMGDItem = {
  project_name: '',
  contractor: '',
  contract_no: '',
  practical_completion_date: '',
  dlp_months: 12,
  dlp_end_date: '',
  cmgd_issued_date: null,
  notes: '',
};

export function CMGDTracker() {
  const [items, setItems] = useState<CMGDItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CMGDItem>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'overdue' | 'due_soon' | 'active' | 'issued'>('all');

  async function reload() {
    setLoading(true);
    try { setItems(await listCMGD()); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  useEffect(() => { reload(); }, []);

  function openNew() { setEditing(EMPTY); setShowForm(true); setError(''); }
  function openEdit(item: CMGDItem) { setEditing({ ...item }); setShowForm(true); setError(''); }

  function handlePCDateChange(iso: string) {
    setEditing((prev) => ({
      ...prev,
      practical_completion_date: iso,
      dlp_end_date: iso ? addMonths(iso, prev.dlp_months) : '',
    }));
  }
  function handleDlpMonthsChange(m: number) {
    setEditing((prev) => ({
      ...prev,
      dlp_months: m,
      dlp_end_date: prev.practical_completion_date ? addMonths(prev.practical_completion_date, m) : '',
    }));
  }

  async function handleSave() {
    if (!editing.project_name || !editing.contractor || !editing.practical_completion_date) {
      setError('Sila isi semua medan yang wajib.'); return;
    }
    setSaving(true); setError('');
    try {
      await saveCMGD(editing);
      setShowForm(false);
      await reload();
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Padam rekod CMGD ini?')) return;
    try { await deleteCMGD(id); await reload(); }
    catch (e) { setError(String(e)); }
  }

  async function markIssued(item: CMGDItem) {
    const today = new Date().toISOString().slice(0, 10);
    try { await saveCMGD({ ...item, cmgd_issued_date: today }); await reload(); }
    catch (e) { setError(String(e)); }
  }

  const filtered = filter === 'all' ? items : items.filter((i) => cmgdStatus(i) === filter);

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, margin: '0 0 3px', color: 'var(--maroon)' }}>CMGD — Certificate of Making Good Defects</h2>
          <p style={{ color: 'var(--muted)', fontSize: 12.5, margin: 0 }}>Pantau tempoh liabiliti kecacatan dan status pengeluaran CMGD.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Tambah Rekod</button>
      </div>

      {/* Filter tabs */}
      <div className="seg" style={{ marginBottom: 16 }}>
        {(['all', 'overdue', 'due_soon', 'active', 'issued'] as const).map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Semua' : STATUS_LABEL[f]}
            {' '}({f === 'all' ? items.length : items.filter((i) => cmgdStatus(i) === f).length})
          </button>
        ))}
      </div>

      {error && <div className="err">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Memuatkan…</p>
      ) : filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '30px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Tiada rekod. <button className="btn" style={{ padding: '5px 12px', marginLeft: 8 }} onClick={openNew}>+ Tambah</button>
        </div>
      ) : (
        filtered.map((item) => {
          const s = cmgdStatus(item);
          return (
            <div key={item.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', marginBottom: 12, borderLeft: `4px solid ${STATUS_COLOR[s]}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ background: STATUS_BG[s], color: STATUS_COLOR[s], fontSize: 10.5, fontWeight: 700, borderRadius: 5, padding: '2px 8px', border: `1px solid ${STATUS_COLOR[s]}44` }}>
                      {STATUS_LABEL[s]}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{item.project_name}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 }}>
                    {item.contractor}{item.contract_no ? ` · ${item.contract_no}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
                    <span><b>Siap Praktikal:</b> {fmtDate(item.practical_completion_date)}</span>
                    <span><b>DLP:</b> {item.dlp_months} bulan</span>
                    <span><b>Tamat DLP:</b> {fmtDate(item.dlp_end_date)}</span>
                    {item.cmgd_issued_date
                      ? <span style={{ color: STATUS_COLOR.issued }}><b>CMGD:</b> {fmtDate(item.cmgd_issued_date)}</span>
                      : <span style={{ color: STATUS_COLOR[s], fontWeight: 600 }}>{daysUntil(item.dlp_end_date)}</span>
                    }
                  </div>
                  {item.notes && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>{item.notes}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                  {s !== 'issued' && (
                    <button className="btn" style={{ padding: '5px 12px', fontSize: 12, background: '#ecfdf5', color: '#1a6e3c', borderColor: '#a7f3d0' }} onClick={() => markIssued(item)}>
                      ✓ CMGD Dikeluarkan
                    </button>
                  )}
                  <button className="btn" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => openEdit(item)}>Edit</button>
                  <button className="btn" style={{ padding: '5px 12px', fontSize: 12, color: '#b00020', borderColor: '#f6c9c9' }} onClick={() => handleDelete(item.id!)}>Padam</button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 100 }} onClick={() => setShowForm(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540, boxShadow: '0 12px 48px rgba(0,0,0,.25)', overflow: 'auto', maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontFamily: 'Sora, sans-serif', fontSize: 15 }}>{editing.id ? 'Edit Rekod CMGD' : 'Rekod CMGD Baharu'}</b>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)', lineHeight: 1, padding: '0 6px' }}>×</button>
            </div>
            <div style={{ padding: '18px 18px 10px' }}>
              <div className="field"><label>Nama Projek *</label><input value={editing.project_name} onChange={(e) => setEditing((p) => ({ ...p, project_name: e.target.value }))} /></div>
              <div className="field"><label>Kontraktor *</label><input value={editing.contractor} onChange={(e) => setEditing((p) => ({ ...p, contractor: e.target.value }))} /></div>
              <div className="field"><label>No. Kontrak / Sebutharga</label><input value={editing.contract_no ?? ''} onChange={(e) => setEditing((p) => ({ ...p, contract_no: e.target.value }))} /></div>
              <div className="grid2">
                <div className="field">
                  <label>Tarikh Siap Praktikal *</label>
                  <input type="date" value={editing.practical_completion_date} onChange={(e) => handlePCDateChange(e.target.value)} />
                </div>
                <div className="field">
                  <label>Tempoh DLP (bulan)</label>
                  <select value={editing.dlp_months} onChange={(e) => handleDlpMonthsChange(Number(e.target.value))}>
                    {[6, 12, 18, 24, 36].map((m) => <option key={m} value={m}>{m} bulan</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Tarikh Tamat DLP (dikira auto)</label>
                <input value={editing.dlp_end_date ? fmtDate(editing.dlp_end_date) : ''} readOnly style={{ background: '#f3efe9', color: 'var(--muted)' }} />
              </div>
              <div className="field">
                <label>Tarikh CMGD Dikeluarkan (kosong jika belum)</label>
                <input type="date" value={editing.cmgd_issued_date ?? ''} onChange={(e) => setEditing((p) => ({ ...p, cmgd_issued_date: e.target.value || null }))} />
              </div>
              <div className="field"><label>Nota</label><textarea style={{ minHeight: 70 }} value={editing.notes ?? ''} onChange={(e) => setEditing((p) => ({ ...p, notes: e.target.value }))} /></div>
              {error && <div className="err">{error}</div>}
              <div className="btn-row" style={{ paddingBottom: 8 }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
                <button className="btn" onClick={() => setShowForm(false)}>Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
