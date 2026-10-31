import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const fixture = JSON.parse(readFileSync(join(__dirname, "fixtures/sim-responses.json"), "utf8")) as {
  receipt: { data: { runId: string; statusUrl: string } };
  completedRun: { data: { runId: string; workflowId: string; status: string; output: { result: string } } };
  failedRun: { data: { runId: string; workflowId: string; status: string; error: { code: string; message: string } } };
};

const executeRequest = { input: { message: "Return the fixture marker." }, async: true };
const apiKey = "FIXTURE_API_KEY_SENTINEL";

async function runWithStatusFixture(page: Page, statusFixture: typeof fixture.completedRun | typeof fixture.failedRun) {
  await page.route("https://sim.fixture.invalid/**", async (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === "POST" && url.pathname === "/api/v2/workflows/fixture-workflow/execute") {
      expect(route.request().headers()["x-api-key"]).toBe(apiKey);
      expect(route.request().postDataJSON()).toEqual(executeRequest);
      await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify(fixture.receipt) });
      return;
    }
    if (route.request().method() === "GET" && url.pathname === new URL(fixture.receipt.data.statusUrl).pathname) {
      expect(url.searchParams.get("includeOutput")).toBe("true");
      expect(url.pathname).toContain(fixture.receipt.data.runId);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(statusFixture) });
      return;
    }
    if (url.pathname === "/") {
      await route.fulfill({ contentType: "text/html", body: "<!doctype html><title>fixture</title>" });
      return;
    }
    await route.fulfill({ status: 404, body: "not found" });
  });

  await page.goto("https://sim.fixture.invalid/");
  return page.evaluate(async ({ request, fixtureApiKey }) => {
    const response = await fetch("/api/v2/workflows/fixture-workflow/execute", {
      method: "POST",
      headers: { "content-type": "application/json", "X-API-Key": fixtureApiKey },
      body: JSON.stringify(request),
    });
    const receipt = await response.json();
    const statusResponse = await fetch(`${receipt.data.statusUrl}?includeOutput=true`, {
      headers: { "X-API-Key": fixtureApiKey },
    });
    return { executeStatus: response.status, receipt, statusStatus: statusResponse.status, run: await statusResponse.json() };
  }, { request: executeRequest, fixtureApiKey: apiKey });
}

test("fixture-only Sim v2 async receipt is correlated to its native run readback", async ({ page }) => {
  const { executeStatus, receipt, statusStatus, run } = await runWithStatusFixture(page, fixture.completedRun);
  expect(executeStatus).toBe(202);
  expect(statusStatus).toBe(200);
  expect(receipt.data.runId).toBe(fixture.completedRun.data.runId);
  expect(run.data.runId).toBe(receipt.data.runId);
  expect(run.data.workflowId).toBe("fixture-workflow");
  expect(run.data.status).toBe("completed");
  expect(run.data.output.result).toBe("fixture-result");
});

test("fixture-only Sim async receipt preserves an HTTP 200 failed run readback", async ({ page }) => {
  const { executeStatus, receipt, statusStatus, run } = await runWithStatusFixture(page, fixture.failedRun);
  expect(executeStatus).toBe(202);
  expect(statusStatus).toBe(200);
  expect(receipt.data.runId).toBe(fixture.failedRun.data.runId);
  expect(run.data.runId).toBe(receipt.data.runId);
  expect(run.data.status).toBe("failed");
  expect(run.data.error.code).toBe("FIXTURE_FAILURE");
});
