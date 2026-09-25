// Playwright globalSetup for _ui-live.yml: logs in through Authelia once
// with the UI check identity (password + a TOTP code minted by OpenBao,
// never a stored seed) and saves storageState for every project to reuse.
// Selectors are Authelia's own login form (id-prefixed, stable across
// themes). No hostname is hardcoded — UI_LIVE_URL is an input/env value.
import { chromium } from "@playwright/test";
import { assertLiveEnv, assertTotpShape } from "./ui-live-env.mjs";

export default async function globalSetup() {
  const { url, user, password, totpCode } = assertLiveEnv(process.env);
  assertTotpShape(totpCode);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(url);
    await page.locator("#username-textfield input").fill(user);
    await page.locator("#password-textfield input").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.locator("#otp-input input").first().fill(totpCode);
    await page.waitForURL((u) => !u.pathname.includes("/authelia"), {
      timeout: 30_000,
    });
    await page.context().storageState({
      path: process.env.UI_LIVE_STORAGE_STATE || "storageState.json",
    });
  } finally {
    await browser.close();
  }
}
