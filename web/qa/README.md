# Workspace browser checks

These checks run the real React UI, document renderers, and IndexedDB draft store
with isolated browser mocks for authentication, repository calls, and generation.
They never write to live accounts or databases. They do not verify Google OAuth,
live generation quality, storage policies, or actual printer output.

Start Vite from the repository root:

```sh
npm --prefix web run dev -- --host 127.0.0.1
```

In a second terminal:

```sh
npm --prefix web/qa ci
npx --prefix web/qa playwright install chromium
npm --prefix web/qa run check
```

The server defaults to `http://127.0.0.1:5173`. Set `UI_BASE_URL` for another port
and `UI_SCREENSHOT_DIR` to choose a screenshot directory (defaults to ignored
`web/qa/artifacts`). The suite verifies responsive layouts, archive filters,
keyboard dialog behaviour, CMGD date calculation, reusable project profiles,
failed regeneration preserving edits, archive save retries, draft recovery,
and WCAG A/AA automated accessibility checks. Iframe document contents are
excluded from the shell accessibility scan and should be checked separately.

Run `node web/qa/auth.smoke.mjs` from the repository root to exercise the real
AuthProvider with a mocked Supabase client. It checks Google domain hints,
provider-verified UTM identity, spoofed profile metadata, OAuth and network
errors, 404/crash recovery, and desktop/mobile login accessibility.
The workspace suite also holds generation requests open to check the loading
animation, disabled preview actions, mobile preview and reduced-motion mode.
