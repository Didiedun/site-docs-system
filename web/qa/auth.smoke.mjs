import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const baseURL = process.env.UI_BASE_URL || "http://127.0.0.1:5173";
const out =
  process.env.UI_SCREENSHOT_DIR ||
  new URL("./artifacts", import.meta.url).pathname;
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
let scenario = "signed-out",
  oauthFailure = false,
  crash = false;
await page.route("**/*", (route) => {
  const url = new URL(route.request().url());
  return ["127.0.0.1", "localhost"].includes(url.hostname)
    ? route.continue()
    : route.abort();
});
await page.route(
  /\/src\/infrastructure\/supabase\/client\.ts(?:\?.*)?$/,
  (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
const scenario=${JSON.stringify(scenario)};
let user={id:'qa-user',email:'staff@utm.my',email_confirmed_at:'2026-01-01',is_anonymous:false,user_metadata:{full_name:'Pengguna ujian'},identities:[{provider:'google',identity_data:{email:'staff@utm.my',email_verified:true,custom_claims:{hd:'utm.my'}}}]};
if(scenario==='external')user.email='staff@gmail.com';
if(scenario==='lookalike')user.email='staff@utm.my.evil.test';
if(scenario==='unverified')user.identities[0].identity_data.email_verified=false;
if(scenario==='wrong-domain')user.identities[0].identity_data.custom_claims.hd='gmail.com';
if(scenario==='spoof'){user.identities=[];user.user_metadata={email:'staff@utm.my',email_verified:true,custom_claims:{hd:'utm.my'},utm_access:true};}
let session=['signed-out'].includes(scenario)?null:{access_token:'qa-token',user};
let callback;
window.__oauthOptions=null;window.__signedOut=false;
export const supabase={auth:{
 getSession:async()=>({data:{session},error:null}),
 getUser:async()=>({data:{user},error:scenario==='offline'?new Error('offline'):null}),
 onAuthStateChange:cb=>{callback=cb;return {data:{subscription:{unsubscribe(){}}}};},
 signOut:async()=>{window.__signedOut=true;session=null;callback?.('SIGNED_OUT',null);return {error:null};},
 signInWithOAuth:async options=>{window.__oauthOptions=options;return {error:${oauthFailure} ? new Error('failed'):null};}
}};`,
    }),
);
await page.route(/\/src\/ui\/Dashboard\.tsx(?:\?.*)?$/, (route) =>
  route.fulfill({
    contentType: "application/javascript",
    body: crash
      ? 'export function Dashboard(){throw new Error("QA render failure");}'
      : 'export function Dashboard(){return "Verified workspace";}',
  }),
);
await page.route(
  /\/src\/infrastructure\/supabase\/repositories\.ts(?:\?.*)?$/,
  (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
export const supabase={};export class SessionExpiredError extends Error{};export class SupabaseDocumentRepository{};
export const listArchivedDocs=async()=>[];export const listCMGD=async()=>[];export const cmgdStatus=()=>'';
export const deleteArchivedDoc=async()=>{};export const deleteCMGD=async()=>{};export const saveCMGD=async()=>{};
export const saveArchivedDoc=async()=>{};export const uploadDocumentFile=async()=>{};export const getSignedDocUrl=async()=>'';
`,
    }),
);
async function visit(hash = "") {
  await page.goto("about:blank");
  await page.goto(baseURL + "/" + hash);
}
async function audit(name) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
    name,
  );
}
try {
  await visit();
  await page.getByRole("heading", { name: "Sambung kerja anda." }).waitFor();
  await audit("login desktop");
  await page.screenshot({ path: out + "/workspace-login.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await audit("login mobile");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: out + "/workspace-mobile-login.png",
    fullPage: true,
  });
  await page.getByText("Perlukan bantuan log masuk?").click();
  await page.getByText(/Pilih akaun yang berakhir/).waitFor();
  await page.getByRole("button", { name: "Log masuk dengan Google" }).click();
  const options = await page.evaluate(() => window.__oauthOptions);
  assert.deepEqual(options.options.queryParams, {
    hd: "utm.my",
    prompt: "select_account",
  });
  oauthFailure = true;
  await visit();
  await page.getByRole("button", { name: "Log masuk dengan Google" }).click();
  await page.getByText(/Log masuk tidak berjaya/).waitFor();
  oauthFailure = false;
  for (scenario of [
    "external",
    "lookalike",
    "unverified",
    "wrong-domain",
    "spoof",
  ]) {
    await visit();
    await page.getByText(/Akses terhad kepada akaun Google UTM/).waitFor();
    assert.equal(await page.evaluate(() => window.__signedOut), true, scenario);
    assert.equal(await page.getByText("Verified workspace").count(), 0);
  }
  scenario = "offline";
  await visit();
  await page.getByText(/Sesi tidak dapat disahkan/).waitFor();
  assert.equal(await page.evaluate(() => window.__signedOut), false);
  scenario = "signed-out";
  await visit("#error=access_denied&error_description=UTM_ACCOUNT_REQUIRED");
  await page.getByText(/Akses terhad kepada akaun Google UTM/).waitFor();
  assert.equal(new URL(page.url()).hash, "");
  scenario = "valid";
  await visit();
  await page.getByText("Verified workspace").waitFor();
  await visit("#missing-page");
  await page
    .getByRole("heading", { name: "Halaman tidak dijumpai." })
    .waitFor();
  await audit("404");
  await page.screenshot({
    path: out + "/workspace-error-404.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Kembali ke ringkasan" }).click();
  await page.getByText("Verified workspace").waitFor();
  crash = true;
  await visit();
  await page
    .getByRole("heading", { name: "Ruang kerja tergendala." })
    .waitFor();
  await audit("error boundary");
  await page.screenshot({ path: out + "/workspace-error.png", fullPage: true });
  crash = false;
  await page.getByRole("link", { name: "Kembali ke ringkasan" }).click();
  await page.getByText("Verified workspace").waitFor();
  console.log(
    "PASS: login layout/accessibility, OAuth options/errors, verified domain and identity checks, spoof rejection, network recovery, callback denial, 404 and crash recovery.",
  );
} finally {
  await browser.close();
}
