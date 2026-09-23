import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
const baseURL = process.env.UI_BASE_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const docs = [
  {
    id: "1",
    kind: "diary",
    title: "Site Diary — Kerja bumbung Blok C",
    project_name: "Naik taraf bumbung akademik",
    created_at: "2026-09-23T04:00:00Z",
    public_url: "/__qa/doc",
    html_path: "diary/1.html",
  },
  {
    id: "2",
    kind: "memo",
    title: "Arahan kerja pembaikan saliran",
    project_name: "Infrastruktur kampus",
    created_at: "2026-09-22T04:00:00Z",
    public_url: "/__qa/doc",
    html_path: "memo/2.html",
  },
  {
    id: "3",
    kind: "minit",
    title: "Minit mesyuarat kemajuan tapak bil. 08",
    project_name: "Naik taraf bumbung akademik",
    created_at: "2026-09-20T04:00:00Z",
    public_url: "/__qa/doc",
    html_path: "minit/3.html",
  },
  {
    id: "4",
    kind: "diary",
    title: "Site Diary — Pemeriksaan kalis air",
    project_name: "Infrastruktur kampus",
    created_at: "2026-09-18T04:00:00Z",
    public_url: "/__qa/doc",
    html_path: "diary/4.html",
  },
];
const cmgd = [
  {
    id: "1",
    project_name: "Pembaikan bumbung Fakulti Kejuruteraan",
    contractor: "Bina Cekap Sdn. Bhd.",
    contract_no: "UTM/2025/019",
    practical_completion_date: "2025-09-01",
    dlp_months: 12,
    dlp_end_date: "2026-09-01",
  },
  {
    id: "2",
    project_name: "Naik taraf laluan pejalan kaki",
    contractor: "Maju Jaya Resources",
    contract_no: "UTM/2025/024",
    practical_completion_date: "2025-10-10",
    dlp_months: 12,
    dlp_end_date: "2026-10-10",
  },
  {
    id: "3",
    project_name: "Sistem saliran kampus",
    contractor: "Bina Cekap Sdn. Bhd.",
    practical_completion_date: "2026-02-01",
    dlp_months: 12,
    dlp_end_date: "2027-02-01",
  },
];
let failGenerate = false,
  failLists = false,
  failSave = false,
  uploaded = "";
await page.route("**/*", async (route) => {
  const url = new URL(route.request().url());
  if (url.pathname.endsWith("/health"))
    return route.fulfill({ json: { status: "ok" } });
  if (url.pathname.endsWith("/generate"))
    return route.fulfill(
      failGenerate
        ? { status: 503, json: { error: "test failure" } }
        : {
            json: {
              body: JSON.stringify({
                aktiviti: "Kerja pemeriksaan bumbung selesai.",
                blok: [{ no: "2.", text: "Kerja pembaikan perlu disiapkan." }],
                seksyen: [],
              }),
            },
          },
    );
  if (
    url.origin === new URL(baseURL).origin ||
    url.hostname.endsWith("googleapis.com") ||
    url.hostname.endsWith("gstatic.com")
  )
    return route.continue();
  return route.abort();
});
await page.route("**/src/ui/AuthProvider.tsx", (route) =>
  route.fulfill({
    contentType: "application/javascript",
    body: `export function AuthProvider({children}) {return children;} export function useAuth(){return {user:{id:'ui-test',email:'hadirah@example.test',user_metadata:{full_name:'Hadirah'}},loading:false,signIn:async()=>{},signOut:async()=>{}};}`,
  }),
);
await page.route("**/src/infrastructure/supabase/repositories.ts", (route) =>
  route.fulfill({
    contentType: "application/javascript",
    body: `
async function request(path, init) {const r=await fetch('/__qa/'+path,init);if(!r.ok)throw new Error('Test failure');return r.json();}
export const supabase={};export class SessionExpiredError extends Error{};export class SupabaseDocumentRepository { async save(d){return d;} }
export const listArchivedDocs=()=>request('docs');export const listCMGD=()=>request('cmgd');
export const deleteArchivedDoc=()=>request('delete');export const deleteCMGD=()=>request('delete');export const saveCMGD=i=>request('save-cmgd',{method:'POST',body:JSON.stringify(i)});
export const saveArchivedDoc=d=>request('save',{method:'POST',body:JSON.stringify(d)});export const uploadDocumentFile=async b=>request('upload',{method:'POST',body:b});
export const getSignedDocUrl=async()=>'/__qa/doc';
export function cmgdStatus(i){if(i.cmgd_issued_date)return 'issued';const d=Math.ceil((new Date(i.dlp_end_date)-new Date('2026-09-23'))/86400000);return d<0?'overdue':d<=30?'due_soon':'active';}
`,
  }),
);
await page.route("**/__qa/**", async (route) => {
  const path = new URL(route.request().url()).pathname.split("/").pop();
  if (path === "docs" || path === "cmgd")
    return route.fulfill(
      failLists
        ? { status: 503, json: {} }
        : { json: path === "docs" ? docs : cmgd },
    );
  if (path === "doc")
    return route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html lang="ms"><title>Dokumen ujian</title><body><h1>Dokumen ujian</h1><p>Untuk semakan UI sahaja.</p></body></html>',
    });
  if (path === "upload") {
    uploaded = route.request().postData();
    return route.fulfill(
      failSave
        ? { status: 503, json: {} }
        : { json: { publicUrl: "/__qa/doc", fullPath: "diary/test.html" } },
    );
  }
  return route.fulfill({ json: {} });
});
const nav = (name) =>
  page
    .getByRole("navigation", { name: "Navigasi utama", exact: true })
    .getByRole("button", { name, exact: true });
const out =
  process.env.UI_SCREENSHOT_DIR ||
  fileURLToPath(new URL("./artifacts", import.meta.url));
await fs.mkdir(out, { recursive: true });
async function screenshot(name) {
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
}
async function audit(label) {
  const a = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .disableRules(["frame-tested"])
    .analyze();
  console.log(
    label,
    "accessibility:",
    JSON.stringify(
      a.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ),
  );
  assert.equal(a.violations.length, 0, label + " accessibility");
}
try {
  await page.goto(baseURL);
  await page
    .getByRole("heading", { name: "Selamat datang, Hadirah." })
    .waitFor();
  await page
    .getByRole("button", {
      name: "Site Diary — Kerja bumbung Blok C",
      exact: true,
    })
    .waitFor();
  await screenshot("workspace-dashboard");
  await audit("dashboard");
  await nav("Arkib dokumen").click();
  await page.getByLabel("Jenis dokumen", { exact: true }).selectOption("memo");
  assert.equal(await page.locator("tbody tr").count(), 1);
  await page.getByLabel("Jenis dokumen", { exact: true }).selectOption("all");
  await page.getByLabel("Cari dokumen", { exact: true }).fill("kalis");
  assert.equal(await page.locator("tbody tr").count(), 1);
  await page.getByLabel("Cari dokumen", { exact: true }).fill("");
  await screenshot("workspace-archive");
  await audit("archive");
  await page.getByRole("button", { name: "Buka", exact: true }).first().click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  await nav("Jejak CMGD").click();
  await page.getByRole("button", { name: "Tambah rekod", exact: true }).click();
  await page.getByLabel("Nama projek *", { exact: true }).fill("Projek ujian");
  await page
    .getByLabel("Kontraktor *", { exact: true })
    .fill("Kontraktor ujian");
  await page
    .getByLabel("Tarikh siap praktikal *", { exact: true })
    .fill("2024-08-31");
  await page.getByLabel(/^Tempoh DLP/).selectOption("6");
  assert.match(
    await page.getByLabel("Tarikh tamat DLP", { exact: true }).inputValue(),
    /28.*2025/,
  );
  await audit("CMGD dialog");
  await page.keyboard.press("Escape");
  await screenshot("workspace-cmgd");
  await nav("Jana dokumen").click();
  await page
    .getByRole("heading", { name: "Jana dokumen", exact: true })
    .waitFor();
  await screenshot("workspace-studio");
  await audit("studio");
  await page.getByRole("button", { name: "03 Semakan" }).click();
  await page
    .getByRole("button", { name: "Jana dokumen", exact: true })
    .last()
    .click();
  await page
    .getByText("Sila isi nama projek dan tarikh dokumen sebelum menjana.")
    .waitFor();
  await page.locator(".profile-picker > summary").click();
  await page
    .getByRole("button", { name: "+ Profil baharu", exact: true })
    .click();
  await page
    .getByLabel("Nama projek *", { exact: true })
    .fill("Projek profil ujian");
  await page
    .getByLabel("Kontraktor", { exact: true })
    .fill("Kontraktor profil");
  await page
    .getByRole("button", { name: "Simpan profil", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Gunakan profil", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Tajuk Kerja", { exact: true }).inputValue(),
    "Projek profil ujian",
  );
  await page.getByLabel("Tarikh", { exact: true }).fill("2026-09-23");
  await page.getByRole("button", { name: "02 Kandungan" }).click();
  await page
    .getByLabel("Nota harian (aktiviti, pekerja, isu…)")
    .fill("Pemeriksaan bumbung selesai. Enam pekerja hadir.");
  await page.getByRole("button", { name: "03 Semakan" }).click();
  await page
    .getByRole("button", { name: "Jana dokumen", exact: true })
    .last()
    .click();
  await page.locator("#diaryFrame").waitFor();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .frameLocator("#diaryFrame")
    .locator("body")
    .evaluate((el) => {
      el.insertAdjacentHTML("beforeend", "<p>CATATAN EDIT DIKEKALKAN</p>");
      el.dispatchEvent(new InputEvent("input", { bubbles: true }));
    });
  await page.getByRole("button", { name: "Selesai edit", exact: true }).click();
  failGenerate = true;
  await page
    .getByRole("button", { name: "Jana semula dokumen", exact: true })
    .click();
  await page
    .getByText(
      "Dokumen tidak dapat dijana. Sila cuba lagi. Pratonton terdahulu masih tersedia.",
    )
    .waitFor();
  assert.match(
    await page.frameLocator("#diaryFrame").locator("body").innerText(),
    /CATATAN EDIT DIKEKALKAN/,
  );
  failGenerate = false;
  failSave = true;
  await page
    .getByRole("button", { name: "Simpan ke arkib", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cuba simpan lagi", exact: true })
    .waitFor();
  assert.match(uploaded, /CATATAN EDIT DIKEKALKAN/);
  failSave = false;
  await page
    .getByRole("button", { name: "Cuba simpan lagi", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Disimpan ke arkib", exact: true })
    .waitFor();
  // A new unsaved form edit should survive immediate navigation.
  await page.getByRole("button", { name: "01 Maklumat" }).click();
  await page
    .getByLabel("Tajuk Kerja", { exact: true })
    .fill("Draf selepas simpan");
  await nav("Ringkasan").click();
  await nav("Jana dokumen").click();
  await page.getByRole("button", { name: "Pulihkan", exact: true }).click();
  assert.equal(
    await page.getByLabel("Tajuk Kerja", { exact: true }).inputValue(),
    "Draf selepas simpan",
  );
  // Verify all modes have labelled fields.
  await page.getByRole("button", { name: "Memo", exact: true }).click();
  await audit("memo");
  await page.getByLabel("Tarikh", { exact: true }).fill("2026-09-23");
  await page.getByRole("button", { name: "03 Semakan" }).click();
  await page
    .getByRole("button", { name: "Jana dokumen", exact: true })
    .last()
    .click();
  await page.locator("#memoFrame").waitFor();
  assert.equal(await page.locator("#diaryFrame").count(), 0);

  await page.getByRole("button", { name: "Minit", exact: true }).click();
  await audit("minit");
  await page.getByLabel("Tarikh Mesyuarat", { exact: true }).fill("2026-09-23");
  await page.getByRole("button", { name: "03 Semakan" }).click();
  await page
    .getByRole("button", { name: "Jana dokumen", exact: true })
    .last()
    .click();
  await page.locator("#minitFrame").waitFor();
  assert.equal(await page.locator("#memoFrame").count(), 0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Isi maklumat", exact: true }).click();
  await page.getByRole("button", { name: "01 Maklumat" }).click();
  await screenshot("workspace-mobile-studio");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "mobile page overflow",
  );
  await page.getByRole("button", { name: /^Pratonton/ }).click();
  assert.equal(await page.locator(".studio-form").isVisible(), false);
  await page.getByRole("button", { name: "Isi maklumat", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Navigasi mudah alih" })
    .getByRole("button", { name: "Ringkasan", exact: true })
    .click();
  await screenshot("workspace-mobile-dashboard");
  await audit("mobile dashboard");
  failLists = true;
  await page
    .getByRole("navigation", { name: "Navigasi mudah alih" })
    .getByRole("button", { name: "Arkib dokumen", exact: true })
    .click();
  await page.getByRole("button", { name: "Cuba lagi", exact: true }).waitFor();
  failLists = false;
  await page.getByRole("button", { name: "Cuba lagi", exact: true }).click();
  await page.locator("tbody tr").first().waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "archive mobile overflow",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: responsive layouts, archive filters, dialog keyboard access, CMGD dates, project profiles, generation recovery, edited HTML archive save, draft recovery, error retry.",
  );
} catch (error) {
  await screenshot("workspace-test-failure");
  console.log(
    "Failure page:",
    (await page.locator("body").innerText()).slice(-6000),
  );
  console.log("Browser errors:", errors);
  throw error;
} finally {
  await browser.close();
}
