# Shared Word templates

These five DOCX files are cleaned copies of supplied examples. Personal names,
identity numbers, contact details, project data and document metadata were
removed or replaced with bracketed placeholders. The source files are not
stored here. Review the wording and replace placeholders before official use.

The application lists them in **Templat surat** (`#templates`). Downloads use
the private Supabase Storage bucket `templates`, not public web assets. The
`20260924054131_add_shared_document_templates.sql` migration grants read access
to verified UTM Google accounts through `private.has_utm_access()`. Browser
clients cannot upload, replace or delete shared templates.

## Publish or replace a template

1. Remove filled-in details, comments, revision history and identifying metadata.
   Render the Word file and inspect every page before publishing.
2. Update `checksums.json` (file name, byte size and SHA-256) and the catalogue in
   `web/src/infrastructure/templates.ts` together.
3. With an administrator's Supabase CLI session linked to the intended project,
   apply pending migrations and upload each approved DOCX:

   ```sh
   supabase storage cp --linked --experimental \
     --content-type application/vnd.openxmlformats-officedocument.wordprocessingml.document \
     supabase/templates/borang-serah-kunci.docx ss:///templates/borang-serah-kunci.docx
   ```

4. Download the uploaded object with the CLI and compare its SHA-256 with the
   manifest. Run `node web/qa/templates.smoke.mjs` with Vite running, then deploy
   the frontend catalogue. Never place original filled-in examples in `public/`.

The UI browser check verifies every downloaded file against the manifest with
isolated storage responses. Live Storage access rules must be checked separately.
