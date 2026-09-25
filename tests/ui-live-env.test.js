import { describe, test, expect } from "bun:test";
import {
  assertLiveEnv,
  assertTotpShape,
} from "../.github/scripts/ui-live-env.mjs";

const FULL_ENV = {
  UI_LIVE_URL: "https://example.invalid/",
  UI_LIVE_USER: "svc-synthetic-ui",
  UI_LIVE_PASSWORD: "hunter2",
  UI_LIVE_TOTP_CODE: "123456",
};

describe("assertLiveEnv", () => {
  test("returns the four fields when all are present", () => {
    expect(assertLiveEnv(FULL_ENV)).toEqual({
      url: FULL_ENV.UI_LIVE_URL,
      user: FULL_ENV.UI_LIVE_USER,
      password: FULL_ENV.UI_LIVE_PASSWORD,
      totpCode: FULL_ENV.UI_LIVE_TOTP_CODE,
    });
  });

  test("throws naming every missing field", () => {
    expect(() => assertLiveEnv({ UI_LIVE_URL: "x" })).toThrow(
      /UI_LIVE_USER.*UI_LIVE_PASSWORD.*UI_LIVE_TOTP_CODE/,
    );
  });
});

describe("assertTotpShape", () => {
  test("accepts a 6-digit code", () => {
    expect(assertTotpShape("123456")).toBe("123456");
  });

  test("rejects a short code", () => {
    expect(() => assertTotpShape("123")).toThrow();
  });

  test("rejects a non-numeric code", () => {
    expect(() => assertTotpShape("12345a")).toThrow();
  });
});
