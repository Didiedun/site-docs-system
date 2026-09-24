import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../../supabase/templates/", import.meta.url);
const checks = JSON.parse(
  await fs.readFile(new URL("checksums.json", root), "utf8"),
);
const base = process.env.UI_BASE_URL || "http://127.0.0.1:5173";
const out =
  process.env.UI_SCREENSHOT_DIR ||
  new URL("./artifacts/", import.meta.url).pathname;
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
let fail = false,
  hold = false,
  release;
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/*", (route) =>
  new URL(route.request().url()).origin === base
    ? route.continue()
    : route.abort(),
);
await page.route(/\/src\/ui\/AuthProvider\.tsx(?:\?.*)?$/, (route) =>
  route.fulfill({
    contentType: "application/javascript",
    body: `export function AuthProvider({children}){return children;}export function useAuth(){return {user:{id:'qa',email:'staff@utm.my',user_metadata:{full_name:'Pengguna ujian'}},loading:false,signOut:async()=>{}};}`,
  }),
);
await page.route(
  /\/src\/infrastructure\/supabase\/client\.ts(?:\?.*)?$/,
  (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `export const supabase={storage:{from(bucket){if(bucket!=='templates')throw new Error('Wrong bucket');return {download:async path=>{const r=await fetch('/__qa/templates/'+path);return r.ok?{data:await r.blob(),error:null}:{data:null,error:new Error('offline')};}};}}};`,
    }),
);
await page.route(
  /\/src\/infrastructure\/supabase\/repositories\.ts(?:\?.*)?$/,
  (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `export const supabase={};export class SessionExpiredError extends Error{};export class SupabaseDocumentRepository{};export const listArchivedDocs=async()=>[];export const listCMGD=async()=>[];export const cmgdStatus=()=>'';export const deleteArchivedDoc=async()=>{};export const deleteCMGD=async()=>{};export const saveCMGD=async()=>{};export const saveArchivedDoc=async()=>{};export const uploadDocumentFile=async()=>{};export const getSignedDocUrl=async()=>'';`,
    }),
);
await page.route("**/__qa/templates/*", async (route) => {
  if (hold)
    await new Promise((r) => {
      release = r;
    });
  if (fail) return route.fulfill({ status: 503, body: "offline" });
  const name = new URL(route.request().url()).pathname.split("/").pop();
  assert(checks.some((x) => x.file === name));
  return route.fulfill({
    body: await fs.readFile(new URL(name, root)),
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
});
async function audit(label) {
  const a = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    a.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
    label,
  );
}
async function download(button) {
  const event = page.waitForEvent("download");
  await button.click();
  const d = await event;
  const bytes = await fs.readFile(await d.path());
  const entry = checks.find((x) => x.file === d.suggestedFilename());
  assert(entry);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), entry.sha256);
  return d.suggestedFilename();
}
try {
  await page.goto(base + "/#templates");
  await page.getByRole("heading", { name: "Templat & contoh surat" }).waitFor();
  assert.equal(await page.locator(".template-row").count(), 5);
  await audit("desktop templates");
  await page.screenshot({
    path: out + "/workspace-templates.png",
    fullPage: true,
  });
  const names = [];
  for (const button of await page.locator(".template-row button").all())
    names.push(await download(button));
  assert.equal(new Set(names).size, 5);
  await page.getByRole("searchbox", { name: "Cari templat" }).fill("kunci");
  assert.equal(await page.locator(".template-row").count(), 1);
  await page.getByRole("searchbox", { name: "Cari templat" }).fill("");
  await page
    .getByLabel("Kategori", { exact: true })
    .selectOption("Serahan & aset");
  assert.equal(await page.locator(".template-row").count(), 2);
  await page
    .getByRole("searchbox", { name: "Cari templat" })
    .fill("nothing-matches");
  await page.getByRole("heading", { name: "Tiada templat sepadan" }).waitFor();
  await page.getByRole("button", { name: "Tetapkan semula carian" }).click();
  assert.equal(await page.locator(".template-row").count(), 5);
  fail = true;
  await page.locator(".template-row button").first().click();
  await page.getByRole("alert").waitFor();
  fail = false;
  await download(page.getByRole("button", { name: "Cuba lagi", exact: true }));
  assert.equal(await page.getByRole("alert").count(), 0);
  hold = true;
  await page.locator(".template-row button").first().click();
  await page.getByText("Menyediakan…", { exact: true }).waitFor();
  assert.equal(await page.locator(".template-row button:disabled").count(), 5);
  const event = page.waitForEvent("download");
  hold = false;
  release();
  await event;
  await page.setViewportSize({ width: 390, height: 844 });
  await audit("mobile templates");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: out + "/workspace-mobile-templates.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 740 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page
    .getByRole("navigation", { name: "Navigasi mudah alih" })
    .getByRole("button", { name: "Ringkasan", exact: true })
    .click();
  await page.getByRole("button", { name: /Perlukan contoh surat/ }).click();
  await page.getByRole("heading", { name: "Templat & contoh surat" }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: all five Word downloads match checksums; search, category, empty state, retry, pending state, mobile navigation and accessibility.",
  );
} finally {
  await browser.close();
}
