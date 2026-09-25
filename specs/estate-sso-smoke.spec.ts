// Estate-wide SSO smoke: one generated test per `ui: true` row of the
// dashboard catalog. No per-app code — every row gets the same checks.
//
// The catalog and every hostname come from CATALOG_SOURCE at run time (an
// env var naming a private source this repo never embeds) so this file
// holds no topology. A row in EXPECTED_PENDING_PATH's JSON list (each with
// a reason and a tracker reference) is allowed to fail without reddening
// the run.
import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";

interface CatalogRow {
  name: string;
  url: string;
}

interface PendingEntry {
  name: string;
  reason: string;
  ref: string;
}

function loadCatalog(): CatalogRow[] {
  const source = process.env.CATALOG_SOURCE;
  if (!source) {
    throw new Error("CATALOG_SOURCE env var is required (path or URL to the dashboard catalog)");
  }
  const rows: CatalogRow[] = JSON.parse(readFileSync(source, "utf8"));
  return rows.filter((r) => (r as unknown as { ui?: boolean }).ui !== false);
}

function loadPending(): Map<string, PendingEntry> {
  const path = process.env.EXPECTED_PENDING_PATH || "expected-pending.json";
  if (!existsSync(path)) return new Map();
  const entries: PendingEntry[] = JSON.parse(readFileSync(path, "utf8"));
  return new Map(entries.map((e) => [e.name, e]));
}

const catalog = loadCatalog();
const pending = loadPending();
const BAD_TEXT = /Unauthorized|Forbidden|Bad Gateway|error/i;

for (const row of catalog) {
  const isPending = pending.has(row.name);
  test(`${row.name} is reachable through SSO${isPending ? " (expected pending)" : ""}`, async ({ page }) => {
    test.fixme(isPending, pending.get(row.name)?.reason ?? "listed in expected-pending.json");

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    const response = await page.goto(row.url);
    expect(response?.status(), `${row.name} HTTP status`).toBe(200);

    const finalUrl = page.url();
    expect(finalUrl, `${row.name} did not stay on the Authelia login page`).not.toContain("/authelia");

    const bodyText = await page.locator("body").innerText();
    expect(bodyText, `${row.name} body text`).not.toMatch(BAD_TEXT);

    expect(consoleErrors, `${row.name} console errors`).toEqual([]);

    await page.screenshot({ path: `test-results/estate-sso-smoke/${row.name}.png`, fullPage: true });
  });
}
