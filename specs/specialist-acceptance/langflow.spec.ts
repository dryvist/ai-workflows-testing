import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const fixture = JSON.parse(readFileSync(join(__dirname, "fixtures/langflow-responses.json"), "utf8")) as {
  completedRun: {
    session_id: string;
    outputs: Array<{
      inputs: { input_value: string };
      outputs: Array<{ results: { message: { text: string; session_id: string; flow_id: string } } }>;
    }>;
  };
  validationError: { detail: Array<{ loc: string[]; msg: string; type: string }> };
};
const flowId = "fixture-flow";
const sessionId = "fixture-session";
const apiKey = "FIXTURE_API_KEY_SENTINEL";
const runRequest = {
  context: {},
  input_request: {
    input_type: "chat",
    input_value: "Return the fixture marker.",
    output_type: "chat",
    output_component: "",
    session_id: sessionId,
  },
};

test("fixture-only Langflow v1 run preserves its session ID and nested output", async ({ page }) => {
  await page.route("https://langflow.fixture.invalid/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === `/api/v1/run/${flowId}` && route.request().method() === "POST") {
      expect(url.searchParams.get("stream")).toBe("false");
      expect(route.request().headers()["x-api-key"]).toBe(apiKey);
      expect(route.request().postDataJSON()).toEqual(runRequest);
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(fixture.completedRun) });
      return;
    }
    if (url.pathname === "/") {
      await route.fulfill({ contentType: "text/html", body: "<!doctype html><title>fixture</title>" });
      return;
    }
    await route.fulfill({ status: 404, body: "not found" });
  });

  await page.goto("https://langflow.fixture.invalid/");
  const response = await page.evaluate(async ({ request, targetFlowId, fixtureApiKey }) => {
    const run = await fetch(`/api/v1/run/${targetFlowId}?stream=false`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": fixtureApiKey },
      body: JSON.stringify(request),
    });
    return { status: run.status, body: await run.json() };
  }, { request: runRequest, targetFlowId: flowId, fixtureApiKey: apiKey });

  expect(response.status).toBe(200);
  expect(response.body.session_id).toBe(sessionId);
  expect(response.body.outputs[0].outputs[0].results.message.session_id).toBe(sessionId);
  expect(response.body.outputs[0].outputs[0].results.message.flow_id).toBe(flowId);
  expect(response.body.outputs[0].outputs[0].results.message.text).toBe("fixture-result");
});

test("fixture-only Langflow missing input value returns its documented validation error", async ({ page }) => {
  await page.route("https://langflow.fixture.invalid/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === `/api/v1/run/${flowId}` && route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toEqual({
        context: {},
        input_request: {
          input_type: "chat",
          output_type: "chat",
          output_component: "",
          session_id: sessionId,
        },
      });
      await route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify(fixture.validationError) });
      return;
    }
    if (url.pathname === "/") {
      await route.fulfill({ contentType: "text/html", body: "<!doctype html><title>fixture</title>" });
      return;
    }
    await route.fulfill({ status: 404, body: "not found" });
  });

  await page.goto("https://langflow.fixture.invalid/");
  const response = await page.evaluate(async (targetFlowId) => {
    const run = await fetch(`/api/v1/run/${targetFlowId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        context: {},
        input_request: {
          input_type: "chat",
          output_type: "chat",
          output_component: "",
          session_id: "fixture-session",
        },
      }),
    });
    return { status: run.status, body: await run.json() };
  }, flowId);

  expect(response.status).toBe(422);
  expect(response.body).toEqual(fixture.validationError);
});
