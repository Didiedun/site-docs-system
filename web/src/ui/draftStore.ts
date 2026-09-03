// IndexedDB-backed autosave for the Document Studio.
//
// Why IndexedDB and not localStorage: a draft carries the user's photos as
// base64 dataUrls (plus the generated preview HTML, which also embeds them).
// That easily exceeds localStorage's ~5MB cap and would make the write throw.
// IndexedDB gives us hundreds of MB. One DB, one object store, one record per
// draft key.
//
// ponytail: single record per key rewrites all photos on each save. Fine for a
// typical handful of site photos. If someone reports jank with dozens of
// photos, split into two records (small text fields vs. media) so typing never
// rewrites the blobs.

export interface DraftPhoto { name: string; dataUrl: string }
export interface DraftEntry { id: number; catatan: string; photos: DraftPhoto[] }

/** The full working state we persist and restore. `fields` holds every scalar/
 *  small-array header value verbatim, keyed by its React state name. */
export interface DraftData {
  version: number;
  savedAt: number;
  story: string;
  diaryHtml: string;
  memoHtml: string;
  minitHtml: string;
  output: string;
  entries: DraftEntry[];
  fields: Record<string, unknown>;
}

export const DRAFT_VERSION = 2;

// --- pure gate (unit-tested in draftStore.check.ts) ---

/** Is this draft meaningfully different from the pristine (defaults-only) form,
 *  i.e. worth persisting and offering to recover? `pristineFieldsJson` is
 *  JSON.stringify of the initial `fields` bag captured on mount. */
export function isDraftMeaningful(current: DraftData, pristineFieldsJson: string): boolean {
  if (current.story.trim() !== '') return true;
  if (current.diaryHtml || current.memoHtml || current.minitHtml || current.output) return true;
  if (current.entries.some((e) => e.catatan.trim() !== '' || e.photos.length > 0)) return true;
  if (JSON.stringify(current.fields) !== pristineFieldsJson) return true;
  return false;
}

// --- IndexedDB store ---

const DB_NAME = 'sdt-drafts';
const STORE = 'drafts';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDraft(key: string, data: DraftData): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(data, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}

export async function loadDraft(key: string): Promise<DraftData | null> {
  const db = await openDB();
  try {
    const data = await new Promise<DraftData | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as DraftData) ?? null);
      req.onerror = () => reject(req.error);
    });
    // Drop drafts from an older, incompatible shape.
    return data && data.version === DRAFT_VERSION ? data : null;
  } finally { db.close(); }
}

export async function clearDraft(key: string): Promise<void> {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
