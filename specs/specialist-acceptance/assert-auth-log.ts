const fixtureMarkers = ["SESSION_SENTINEL", "TOKEN_SENTINEL"];

export function assertNoFixtureMarkers(lines: string[]): void {
  if (lines.some((line) => fixtureMarkers.some((marker) => line.includes(marker)))) {
    throw new Error("known fixture marker found in log lines");
  }
}
