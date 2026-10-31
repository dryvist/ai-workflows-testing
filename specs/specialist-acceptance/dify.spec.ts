import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const fixture = JSON.parse(readFileSync(join(__dirname, "fixtures/dify-responses.json"), "utf8")) as {
  blockingRun: {
    data: { id: string; status: string; outputs: { result: string } };
    task_id: string;
    workflow_run_id: string;
  };
  runDetail: { id: string; status: string; outputs: { result: string } };
  unauthorized: { code: string; message: string; status: number };
};
const workflowRequest = {
  inputs: { query: "Return the fixture marker." },
  response_mode: "blocking",
  user: "fixture-acceptance",
};
const apiKey = "FIXTURE_API_KEY_SENTINEL";

test("fixture-only Dify workflow run is correlated to native run detail", async ({ page }) => {
  await page.route("https://dify.fixture.invalid/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/v1/workflows/run" && route.request().method() === "POST") {
      expect(route.request().headers().authorization).toBe(`Bearer ${apiKey}`);
      expect(route.request().postDataJSON()).toEqual(workflowRequest);
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(fixture.blockingRun) });
      return;
    }
    if (url.pathname === `/v1/workflows/run/${fixture.blockingRun.workflow_run_id}` && route.request().method() === "GET") {
      expect(route.request().headers().authorization).toBe(`Bearer ${apiKey}`);
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(fixture.runDetail) });
      return;
    }
    if (url.pathname === "/") {
      await route.fulfill({ contentType: "text/html", body: "<!doctype html><title>fixture</title>" });
      return;
    }
    await route.fulfill({ status: 404, body: "not found" });
  });

  await page.goto("https://dify.fixture.invalid/");
  const observed = await page.evaluate(async ({ request, fixtureApiKey }) => {
    const runResponse = await fetch("/v1/workflows/run", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${fixtureApiKey}` },
      body: JSON.stringify(request),
    });
    const run = await runResponse.json();
    const detailResponse = await fetch(`/v1/workflows/run/${run.workflow_run_id}`, {
      headers: { Authorization: `Bearer ${fixtureApiKey}` },
    });
    return { runStatus: runResponse.status, run, detailStatus: detailResponse.status, detail: await detailResponse.json() };
  }, { request: workflowRequest, fixtureApiKey: apiKey });

  expect(observed.runStatus).toBe(200);
  expect(observed.detailStatus).toBe(200);
  expect(observed.run.workflow_run_id).toBe(fixture.blockingRun.data.id);
  expect(observed.run.task_id).toBe(fixture.blockingRun.task_id);
  expect(observed.run.task_id).not.toBe(observed.run.workflow_run_id);
  expect(observed.detail.id).toBe(observed.run.workflow_run_id);
  expect(observed.detail.status).toBe("succeeded");
  expect(observed.detail.outputs.result).toBe("fixture-result");
});

test("fixture-only Dify unauthorized response remains an error without a run identifier", async ({ page }) => {
  await page.route("https://dify.fixture.invalid/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/v1/workflows/run" && route.request().method() === "POST") {
      await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify(fixture.unauthorized) });
      return;
    }
    if (url.pathname === "/") {
      await route.fulfill({ contentType: "text/html", body: "<!doctype html><title>fixture</title>" });
      return;
    }
    await route.fulfill({ status: 404, body: "not found" });
  });

  await page.goto("https://dify.fixture.invalid/");
  const observed = await page.evaluate(async () => {
    const response = await fetch("/v1/workflows/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inputs: {}, response_mode: "blocking", user: "fixture-acceptance" }),
    });
    return { status: response.status, body: await response.json() };
  });

  expect(observed.status).toBe(401);
  expect(observed.body.code).toBe("unauthorized");
  expect(observed.body.status).toBe(401);
  expect(observed.body.workflow_run_id).toBeUndefined();
});
