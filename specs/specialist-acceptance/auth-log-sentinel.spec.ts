import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { assertNoFixtureMarkers } from "./assert-auth-log";

const fixture = JSON.parse(readFileSync(join(__dirname, "fixtures/auth-log-lines.json"), "utf8")) as {
  safe: string[];
  sentinelMarkers: string[];
};

test("fixture-only Authority assertion accepts ordinary lines and detects known markers", async () => {
  assertNoFixtureMarkers(fixture.safe);
  for (const line of fixture.sentinelMarkers) {
    expect(() => assertNoFixtureMarkers([line])).toThrow("known fixture marker found in log lines");
  }
});
