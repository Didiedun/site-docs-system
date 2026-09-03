// Runnable self-check for the pure draft gate. No framework.
//   node --experimental-strip-types src/ui/draftStore.check.ts   (Node >=22.6)
//   or: npx tsx src/ui/draftStore.check.ts
import assert from 'node:assert/strict';
import { isDraftMeaningful, DRAFT_VERSION, type DraftData } from './draftStore.ts';

const pristineFields = { tajukKerja: 'Bumbung Akademik - Pakej 2', waktuMula: '08:00', kepada: '' };
const pristineJson = JSON.stringify(pristineFields);

const base = (): DraftData => ({
  version: DRAFT_VERSION, savedAt: 0,
  story: '', diaryHtml: '', memoHtml: '', minitHtml: '', output: '',
  entries: [], fields: { ...pristineFields },
});

// pristine defaults → not worth saving
assert.equal(isDraftMeaningful(base(), pristineJson), false, 'pristine should be meaningless');

// typed notes → worth saving
assert.equal(isDraftMeaningful({ ...base(), story: 'kerja hari ini' }, pristineJson), true, 'story counts');

// a header field changed from default → worth saving
assert.equal(isDraftMeaningful({ ...base(), fields: { ...pristineFields, kepada: 'Kontraktor A' } }, pristineJson), true, 'changed field counts');

// a photo attached (no text) → worth saving
assert.equal(isDraftMeaningful({ ...base(), entries: [{ id: 1, catatan: '', photos: [{ name: 'a.jpg', dataUrl: 'data:x' }] }] }, pristineJson), true, 'photo counts');

// generated preview present → worth saving
assert.equal(isDraftMeaningful({ ...base(), diaryHtml: '<html>' }, pristineJson), true, 'generated html counts');

// whitespace-only story → still meaningless
assert.equal(isDraftMeaningful({ ...base(), story: '   ' }, pristineJson), false, 'whitespace story is not content');

console.log('draftStore.check: all assertions passed');
