// End-to-end check of sign-in and saved plans against a running app and the live Supabase project.
// Creates two confirmed throwaway users, runs the flow in Chromium, then deletes the users
// (their plans go with them via ON DELETE CASCADE).
//
// Usage: start the app (npm run build && npm start), then
//   node --env-file=.env.local scripts/e2e-auth.mjs [--shots=dir]
// Needs SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF and NEXT_PUBLIC_SUPABASE_URL. BASE_URL defaults
// to http://localhost:3000. In a cloud sandbox, also set NODE_USE_ENV_PROXY=1.
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const { SUPABASE_ACCESS_TOKEN: token, SUPABASE_PROJECT_REF: ref, NEXT_PUBLIC_SUPABASE_URL: supabaseUrl } = process.env;
if (!token || !ref || !supabaseUrl) {
  console.error("Set SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF and NEXT_PUBLIC_SUPABASE_URL.");
  process.exit(1);
}
const shots = process.argv.find((a) => a.startsWith("--shots="))?.slice(8);

// The secret key is fetched for this run only and never written anywhere.
const keys = await (
  await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${token}` } })
).json();
const secret = keys.find((k) => k.type === "secret")?.api_key;
if (!secret) throw new Error("Could not read the project's secret key.");
const admin = (path, init = {}) =>
  fetch(`${supabaseUrl}/auth/v1/admin/${path}`, {
    ...init,
    headers: { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
  });

const PASSWORD = `e2e-${randomBytes(8).toString("hex")}`;
const run = randomBytes(3).toString("hex");
const A_EMAIL = `claww-e2e-${run}-a@example.com`;
const B_EMAIL = `claww-e2e-${run}-b@example.com`;
const userIds = [];
for (const email of [A_EMAIL, B_EMAIL]) {
  const res = await admin("users", { method: "POST", body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }) });
  const body = await res.json();
  if (!body.id) throw new Error(`Could not create test user: ${JSON.stringify(body)}`);
  userIds.push(body.id);
}


const input = {
  age: 25, heightCm: 180, weightKg: 80, bodyFatPct: 18, gender: "Male", goal: "Weight Loss",
  frequency: "2–3 Days", level: "Beginner", foodPref: "Non-Vegetarian", cuisine: "Mixed Indian",
  preferredFoods: [], avoidFoods: [],
};
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const browser = await chromium.launch();
try {
  const seen = (loc) => loc.first().waitFor({ timeout: 10000 }).then(() => true, () => false);

  async function signIn(page, email) {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  }

  // ---- A: signed out, save from preview -> sign in -> plan saved ----
  const ctxA = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const a = await ctxA.newPage();
  await a.goto(`${BASE}/`);
  check("header shows Sign in when signed out", await a.getByRole("link", { name: "Sign in" }).isVisible());
  await a.evaluate((i) => sessionStorage.setItem("claww:preview", JSON.stringify({ input: i, report: { engineVersion: "old" } })), input);
  await a.goto(`${BASE}/plan/preview`);
  const kcal = (await a.locator("#plan-total:visible").innerText()).split("\n")[0];
  await a.getByRole("button", { name: "Save plan" }).click();
  await a.waitForURL(/\/login\?next=/);
  check("Save plan while signed out goes to sign in", true, new URL(a.url()).search);

  await a.getByLabel("Email").fill(A_EMAIL);
  await a.getByLabel("Password").fill("wrong-password");
  await a.locator("form").getByRole("button", { name: "Sign in" }).click();
  await a.locator("form [role=alert]").waitFor();
  check("wrong password shows an error", (await a.locator("form [role=alert]").innerText()).includes("don't match"));

  await signIn(a, A_EMAIL);
  await a.waitForURL(/\/plan\/[0-9a-f-]{36}$/, { timeout: 20000 });
  const planUrl = a.url();
  check("after sign-in the waiting plan is saved and opened", true, planUrl.replace(BASE, ""));
  const savedKcal = (await a.locator("#plan-total:visible").innerText()).split("\n")[0];
  check("saved plan shows the same calories as the preview", savedKcal === kcal, `${kcal} vs ${savedKcal}`);
  check("header shows My plans when signed in", await seen(a.getByRole("link", { name: "My plans" })));
  await a.waitForLoadState("networkidle");
  check("saved plan content is visible", await a.locator("#plan-total:visible").isVisible());
  if (shots) await a.screenshot({ path: `${shots}/saved-plan.png`, fullPage: false });
  const wraps = await a.evaluate(() => [...document.querySelectorAll("header a, header button")].filter((el) => el.getBoundingClientRect().height > 48).map((el) => el.textContent));
  check("header controls stay on one line at 360px", wraps.length === 0, wraps.join(", "));

  await a.goto(`${BASE}/plans`);
  const rows = a.locator("main ul li");
  await seen(rows);
  check("My plans lists the plan", (await rows.count()) === 1, await rows.first().innerText().catch(() => ""));
  if (shots) await a.screenshot({ path: `${shots}/my-plans.png`, fullPage: true });
  const noScroll = await a.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  check("My plans has no horizontal scroll at 360px", noScroll);
  const overflowing = [];
  for (const path of ["/", "/plan/new", "/plan/preview", "/login", planUrl.replace(BASE, "")]) {
    await a.goto(BASE + path);
    await a.waitForLoadState("networkidle");
    if (await a.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) overflowing.push(path);
  }
  check("no page scrolls sideways at 360px (signed in)", overflowing.length === 0, overflowing.join(", "));

  // ---- B: a different user can't see A's plan ----
  const ctxB = await browser.newContext();
  const b = await ctxB.newPage();
  await b.goto(`${BASE}/login?next=/plans`);
  await signIn(b, B_EMAIL);
  await b.waitForURL(`${BASE}/plans`);
  check("user B sees no plans", await seen(b.getByText("No saved plans yet")));
  const resp = await b.goto(planUrl);
  const notFoundShown = await seen(b.getByRole("heading", { name: "We couldn't find that page" }));
  const leaked = (await b.locator("#plan-total:visible").count()) > 0 || (await b.content()).includes(kcal.replace(" kcal a day", ""));
  check("user B gets the not-found page for A's plan, with none of its data", notFoundShown && !leaked, `status ${resp.status()}, leaked=${leaked}`);
  if (shots) await b.screenshot({ path: `${shots}/b-not-found.png` });

  // ---- sign out ----
  await b.goto(`${BASE}/plans`);
  await b.getByRole("button", { name: "Sign out" }).click();
  await b.waitForURL(`${BASE}/`);
  const after = await b.goto(`${BASE}/plans`);
  check("after sign out, /plans redirects to sign in", b.url().includes("/login?next=%2Fplans"), `status ${after.status()}`);

  // ---- A deletes the plan ----
  await a.goto(planUrl);
  check("A's plan still exists after B's attempts", await seen(a.locator("#plan-total:visible")));
  // ---- sharing: link works signed out, and stops working when turned off ----
  await a.getByRole("button", { name: "Create share link" }).click();
  await a.waitForFunction(() => document.querySelector("input[aria-label='Share link']")?.value.startsWith("http"));
  const shareUrl = await a.getByLabel("Share link").inputValue();
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(shareUrl);
  const sharedKcal = (await seen(visitor.locator("#plan-total:visible")))
    ? (await visitor.locator("#plan-total:visible").innerText()).split("\n")[0]
    : "";
  check("share link opens the plan signed out", sharedKcal === kcal, `${shareUrl.replace(BASE, "")} ${sharedKcal}`);
  check("shared view has no owner controls", (await visitor.getByRole("button", { name: /Delete|Create share link|Stop sharing/ }).count()) === 0);
  await a.getByRole("button", { name: "Stop sharing" }).click();
  await a.getByRole("button", { name: "Create share link" }).waitFor();
  await visitor.goto(shareUrl);
  check("stopped link shows not found", await seen(visitor.getByRole("heading", { name: "We couldn't find that page" })));

  await a.getByRole("button", { name: "Delete" }).click();
  await a.getByRole("button", { name: "Yes, delete it" }).click();
  await a.waitForURL(`${BASE}/plans`);
  check("delete returns to an empty My plans", await seen(a.getByText("No saved plans yet")));

  // ---- sign-up validation (no email is sent) ----
  const c = await (await browser.newContext()).newPage();
  await c.goto(`${BASE}/login`);
  await c.getByRole("button", { name: "Create account" }).first().click();
  await c.getByLabel("Email").fill("someone@example.com");
  await c.getByLabel("Password").fill("short");
  await c.evaluate(() => document.querySelector("input[name=password]").removeAttribute("minlength"));
  await c.locator("form").getByRole("button", { name: "Create account" }).click();
  await c.locator("form [role=alert]").waitFor();
  check("sign-up rejects short password on the server", (await c.locator("form [role=alert]").innerText()).includes("8 characters"));
  if (shots) await c.screenshot({ path: `${shots}/login.png` });

  // ---- sign-up signs straight in (email confirmation is off) ----
  const newEmail = `claww-e2e-${run}-new@example.com`;
  await c.getByLabel("Email").fill(newEmail);
  await c.getByLabel("Password").fill(PASSWORD);
  await c.locator("form").getByRole("button", { name: "Create account" }).click();
  await c.waitForURL(`${BASE}/plans`, { timeout: 15000 }).catch(() => {});
  check("new account is signed in straight away", await seen(c.getByRole("heading", { name: "My plans" })), c.url());
  const found = await (await admin(`users?per_page=200`)).json();
  const created = found.users?.find((u) => u.email === newEmail);
  if (created) userIds.push(created.id);
} catch (e) {
  console.error(e);
  results.push(false);
} finally {
  await browser.close();
  for (const id of userIds) await admin(`users/${id}`, { method: "DELETE" });
}

const failed = results.filter((r) => !r).length;
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${results.length} checks passed`);
process.exit(failed ? 1 : 0);
