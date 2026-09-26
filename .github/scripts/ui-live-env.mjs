// Pure helpers for the live-login global setup (playwright-global-setup.mjs).
// Split out so the required env contract has a unit test that runs with no
// browser and no network — see tests/ui-live-env.test.js.

const REQUIRED = ["UI_LIVE_URL", "UI_LIVE_USER", "UI_LIVE_PASSWORD", "UI_LIVE_TOTP_CODE"];

export function assertLiveEnv(env) {
  const missing = REQUIRED.filter((k) => !env[k]);
  if (missing.length) {
    throw new Error(`missing required env: ${missing.join(", ")}`);
  }
  return {
    url: env.UI_LIVE_URL,
    user: env.UI_LIVE_USER,
    password: env.UI_LIVE_PASSWORD,
    totpCode: env.UI_LIVE_TOTP_CODE,
  };
}

// A TOTP code read from OpenBao is a 6-digit string; catch a truncated or
// mis-shaped read before it burns a login attempt against Authelia.
export function assertTotpShape(code) {
  if (!/^\d{6}$/.test(code)) {
    throw new Error(`TOTP code has the wrong shape (expected 6 digits): ${code.length} chars`);
  }
  return code;
}
