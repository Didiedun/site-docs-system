import { useEffect, useState } from 'react';
import { listMeetings, saveMeeting, deleteMeeting, type MeetingRecord } from '../infrastructure/supabase/repositories';
import { useAuth } from './AuthProvider';

const BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogs', 'Sep', 'Okt', 'Nov', 'Dis'];
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}, ${d.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}`;
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit', hour12: false });
}

type FreeBusyCal = { busy: { start: string; end: string }[]; errors?: { domain: string; reason: string }[] };

const EMPTY: Omit<MeetingRecord, 'id' | 'user_id' | 'created_at' | 'calendar_event_id'> = {
  title: '',
  description: '',
  start_time: '',
  end_time: '',
  meet_link: '',
  attendees: [],
};

async function createGoogleCalendarEvent(
  providerToken: string,
  title: string,
  description: string,
  startIso: string,
  endIso: string,
  attendees: string[],
): Promise<{ meetLink: string; eventId: string }> {
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: title,
        description,
        start: { dateTime: startIso, timeZone: 'Asia/Kuala_Lumpur' },
        end: { dateTime: endIso, timeZone: 'Asia/Kuala_Lumpur' },
        attendees: attendees.filter(Boolean).map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Google Calendar API: ${err?.error?.message ?? res.statusText}`);
  }
  const event = await res.json();
  return { meetLink: event.hangoutLink ?? '', eventId: event.id ?? '' };
}

export function MeetingScheduler() {
  const { session } = useAuth();
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY, attendeesRaw: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [freeBusy, setFreeBusy] = useState<Record<string, FreeBusyCal> | null>(null);
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [contacts, setContacts] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('utm_contacts') || '[]') as string[]; }
    catch { return []; }
  });
  const [contactSearch, setContactSearch] = useState('');

  function saveContactsFromAttendees(emails: string[]) {
    setContacts((prev) => {
      const merged = [...new Set([...emails.filter(Boolean), ...prev])].slice(0, 100);
      localStorage.setItem('utm_contacts', JSON.stringify(merged));
      return merged;
    });
  }

  function addContactManually(email: string) {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) return;
    saveContactsFromAttendees([trimmed]);
  }

  function removeContact(email: string) {
    setContacts((prev) => {
      const updated = prev.filter((c) => c !== email);
      localStorage.setItem('utm_contacts', JSON.stringify(updated));
      return updated;
    });
  }

  function addToAttendees(email: string) {
    const cur = form.attendeesRaw.trim();
    const already = cur.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    if (already.includes(email)) return;
    setForm((p) => ({ ...p, attendeesRaw: cur ? cur + '\n' + email : email }));
    setFreeBusy(null);
  }

  async function reload() {
    setLoading(true);
    try { setMeetings(await listMeetings()); }
    catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  useEffect(() => { reload(); }, []);

  async function checkAvailability() {
    const providerToken = session?.provider_token;
    if (!providerToken) { setError('Token Google tidak tersedia. Log keluar dan log masuk semula.'); return; }
    const attendees = form.attendeesRaw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    if (!form.start_time) { setError('Sila pilih tarikh & masa mesyuarat dahulu.'); return; }
    setCheckingAvail(true); setError('');
    try {
      const dateStr = form.start_time.slice(0, 10);
      const items = [{ id: 'primary' }, ...attendees.map((e) => ({ id: e }))];
      const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${providerToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeMin: `${dateStr}T00:00:00+08:00`, timeMax: `${dateStr}T23:59:59+08:00`, timeZone: 'Asia/Kuala_Lumpur', items }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message ?? res.statusText); }
      const data = await res.json();
      setFreeBusy(data.calendars ?? {});
    } catch (e) {
      setError(`Gagal semak ketersediaan: ${e}`);
    } finally {
      setCheckingAvail(false);
    }
  }

  function openNew() {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0);
    const end = new Date(now.getTime() + 60 * 60_000);
    setForm({
      ...EMPTY,
      attendeesRaw: '',
      start_time: now.toISOString().slice(0, 16),
      end_time: end.toISOString().slice(0, 16),
    });
    setShowForm(true); setError(''); setFreeBusy(null);
  }

  async function handleSave() {
    if (!form.title || !form.start_time) { setError('Sila isi tajuk dan masa mesyuarat.'); return; }
    setSaving(true); setError('');
    try {
      const attendees = form.attendeesRaw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
      let meetLink = '';
      let calendarEventId = '';
      const providerToken = session?.provider_token;

      if (providerToken) {
        try {
          const result = await createGoogleCalendarEvent(
            providerToken,
            form.title,
            form.description ?? '',
            new Date(form.start_time).toISOString(),
            form.end_time ? new Date(form.end_time).toISOString() : new Date(new Date(form.start_time).getTime() + 3_600_000).toISOString(),
            attendees,
          );
          meetLink = result.meetLink;
          calendarEventId = result.eventId;
        } catch (calErr) {
          setError(`Amaran: Gagal mencipta Google Calendar event — ${calErr}. Rekod masih disimpan.`);
        }
      } else {
        setError('Amaran: Token Google tidak tersedia. Log keluar dan log masuk semula untuk mendayakan Google Meet. Rekod disimpan tanpa link Meet.');
      }

      await saveMeeting({
        title: form.title,
        description: form.description,
        start_time: new Date(form.start_time).toISOString(),
        end_time: form.end_time ? new Date(form.end_time).toISOString() : undefined,
        meet_link: meetLink,
        calendar_event_id: calendarEventId,
        attendees,
      });
      saveContactsFromAttendees(attendees);
      setShowForm(false);
      await reload();
    } catch (e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Padam rekod mesyuarat ini?')) return;
    try { await deleteMeeting(id); await reload(); }
    catch (e) { setError(String(e)); }
  }

  const now = new Date();
  const upcoming = meetings.filter((m) => new Date(m.start_time) >= now);
  const past = meetings.filter((m) => new Date(m.start_time) < now);
  const displayed = tab === 'upcoming' ? upcoming : past;

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, margin: '0 0 3px', color: 'var(--maroon)' }}>Jadual Mesyuarat</h2>
          <p style={{ color: 'var(--muted)', fontSize: 12.5, margin: 0 }}>Jadualkan mesyuarat dengan Google Meet secara automatik.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Jadual Mesyuarat</button>
      </div>

      {!session?.provider_token && (
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12.5 }}>
          <b>Nota:</b> Untuk mencipta Google Meet secara automatik, log keluar dan log masuk semula supaya kebenaran Calendar dibenarkan.
        </div>
      )}

      <div className="seg" style={{ marginBottom: 16 }}>
        <button className={tab === 'upcoming' ? 'active' : ''} onClick={() => setTab('upcoming')}>Akan Datang ({upcoming.length})</button>
        <button className={tab === 'past' ? 'active' : ''} onClick={() => setTab('past')}>Lepas ({past.length})</button>
      </div>

      {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Memuatkan…</p>
      ) : displayed.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '30px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          {tab === 'upcoming' ? 'Tiada mesyuarat dijadualkan.' : 'Tiada rekod mesyuarat lepas.'}
          {tab === 'upcoming' && <><br /><button className="btn" style={{ marginTop: 12, padding: '7px 16px' }} onClick={openNew}>+ Jadual Mesyuarat</button></>}
        </div>
      ) : (
        displayed.map((m) => (
          <div key={m.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{m.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                  {fmtDateTime(m.start_time)}
                  {m.end_time && ` — ${fmtDateTime(m.end_time)}`}
                </div>
                {m.description && <div style={{ fontSize: 12.5, marginBottom: 6 }}>{m.description}</div>}
                {m.attendees && m.attendees.length > 0 && (
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                    Peserta: {m.attendees.join(', ')}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' }}>
                {m.meet_link ? (
                  <a href={m.meet_link} target="_blank" rel="noreferrer" style={{ background: '#1a73e8', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                    Join Meet
                  </a>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Tiada link Meet</span>
                )}
                <button className="btn" style={{ padding: '5px 10px', fontSize: 12, color: '#b00020', borderColor: '#f6c9c9' }} onClick={() => handleDelete(m.id!)}>Padam</button>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Form modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 100 }} onClick={() => setShowForm(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 12px 48px rgba(0,0,0,.25)', overflow: 'auto', maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ fontFamily: 'Sora, sans-serif', fontSize: 15 }}>Jadual Mesyuarat Baharu</b>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)', lineHeight: 1, padding: '0 6px' }}>×</button>
            </div>
            <div style={{ padding: '18px 18px 10px' }}>
              <div className="field"><label>Tajuk Mesyuarat *</label><input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Cth: Mesyuarat Tapak Bina Bil. 3/2026" /></div>
              <div className="field"><label>Penerangan (opsyenal)</label><textarea style={{ minHeight: 70 }} value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid2">
                <div className="field">
                  <label>Tarikh &amp; Masa Mula *</label>
                  <input type="datetime-local" value={form.start_time} onChange={(e) => { setForm((p) => ({ ...p, start_time: e.target.value })); setFreeBusy(null); }} />
                </div>
                <div className="field">
                  <label>Tarikh &amp; Masa Tamat</label>
                  <input type="datetime-local" value={form.end_time ?? ''} onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))} />
                </div>
              </div>
              <div className="field">
                <label>Peserta</label>
                {/* Saved contacts picker */}
                <div style={{ marginBottom: 6 }}>
                  <input
                    placeholder="Cari kenalan tersimpan atau tambah emel baharu…"
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ',') && contactSearch.includes('@')) {
                        e.preventDefault();
                        addContactManually(contactSearch);
                        addToAttendees(contactSearch.trim().toLowerCase());
                        setContactSearch('');
                      }
                    }}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--line)', borderRadius: 8, font: 'inherit', fontSize: 13 }}
                  />
                  <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {contacts
                      .filter((c) => !contactSearch || c.toLowerCase().includes(contactSearch.toLowerCase()))
                      .slice(0, 15)
                      .map((email) => (
                        <span key={email} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 6, padding: '2px 8px', fontSize: 12 }}>
                          <button
                            type="button"
                            onClick={() => addToAttendees(email)}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', fontSize: 12, color: 'var(--maroon)', fontWeight: 600 }}
                          >
                            {email}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeContact(email)}
                            style={{ background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer', color: '#999', fontSize: 14, lineHeight: 1 }}
                            title="Padam kenalan"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    {contacts.length === 0 && (
                      <span style={{ fontSize: 11.5, color: 'var(--muted)', fontStyle: 'italic' }}>
                        Taip emel di atas dan tekan Enter untuk menyimpan kenalan baharu.
                      </span>
                    )}
                  </div>
                </div>
                <textarea
                  style={{ minHeight: 70 }}
                  value={form.attendeesRaw}
                  onChange={(e) => { setForm((p) => ({ ...p, attendeesRaw: e.target.value })); setFreeBusy(null); }}
                  placeholder="hadirah@utm.my&#10;kontraktor@email.com"
                />
                <p className="hint">Klik nama kenalan di atas untuk tambah, atau taip terus dalam kotak ini.</p>
              </div>
              {form.start_time && (
                <div style={{ marginBottom: 12 }}>
                  {!session?.provider_token ? (
                    <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 9, padding: '8px 12px', fontSize: 12 }}>
                      Log keluar dan log masuk semula untuk mendayakan semakan ketersediaan peserta.
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn"
                        onClick={checkAvailability}
                        disabled={checkingAvail}
                        style={{ padding: '6px 14px', fontSize: 12 }}
                      >
                        {checkingAvail ? 'Menyemak…' : 'Semak Ketersediaan Peserta'}
                      </button>
                      {freeBusy && (
                        <div style={{ marginTop: 10, background: '#f8f9fa', border: '1px solid var(--line)', borderRadius: 9, padding: '10px 12px', fontSize: 12 }}>
                          <b style={{ display: 'block', marginBottom: 6 }}>Ketersediaan — {form.start_time.slice(0, 10)}:</b>
                          {Object.entries(freeBusy).map(([email, cal]) => (
                            <div key={email} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, minWidth: 140, flexShrink: 0 }}>{email === 'primary' ? 'Anda' : email}:</span>
                              {cal.errors && cal.errors.length > 0 ? (
                                <span style={{ color: '#888', fontStyle: 'italic' }}>Kalendar tidak boleh diakses</span>
                              ) : !cal.busy || cal.busy.length === 0 ? (
                                <span style={{ color: '#1a6e3c', fontWeight: 600 }}>Bebas sepanjang hari</span>
                              ) : (
                                <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {cal.busy.map((b, i) => (
                                    <span key={i} style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, padding: '1px 6px', color: '#b00020', fontWeight: 600 }}>
                                      {fmtTime(b.start)}–{fmtTime(b.end)}
                                    </span>
                                  ))}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              <div style={{ background: '#f0f4ff', border: '1px solid #c7d4f8', borderRadius: 9, padding: '10px 12px', fontSize: 12, marginBottom: 12 }}>
                Google Meet link dan jemputan kalendar akan dihantar kepada semua peserta secara automatik.
                {!session?.provider_token && <><br /><b>Log keluar &amp; log masuk semula</b> untuk mengaktifkan Google Meet.</>}
              </div>
              {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}
              <div className="btn-row" style={{ paddingBottom: 8 }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Mencipta mesyuarat…' : 'Jadual & Cipta Meet Link'}
                </button>
                <button className="btn" onClick={() => setShowForm(false)}>Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
