import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const fixture = JSON.parse(readFileSync(join(__dirname, "fixtures/hermes-responses.json"), "utf8")) as {
  sendMessage: {
    jsonrpc: string;
    id: string;
    result: { task: { id: string; contextId: string; status: { state: string }; artifacts: Array<{ parts: Array<{ text: string }> }> } };
  };
  getTask: { jsonrpc: string; id: string; result: { id: string; contextId: string; status: { state: string } } };
  rpcError: { jsonrpc: string; id: string; error: { code: number; message: string } };
};
const apiVersion = "1.0";
const bearer = "FIXTURE_TOKEN_SENTINEL";
const sendRequest = {
  jsonrpc: "2.0",
  id: "fixture-rpc-send",
  method: "SendMessage",
  params: {
    message: {
      messageId: "message-fixture-1",
      role: "ROLE_USER",
      parts: [{ text: "Return the fixture marker.", mediaType: "text/plain" }],
      contextId: "context-fixture-1",
    },
  },
};

test("fixture-only Hermes A2A SendMessage task is correlated through GetTask", async ({ page }) => {
  await page.route("https://hermes.fixture.invalid/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/" && route.request().method() === "POST") {
      expect(route.request().headers()["a2a-version"]).toBe(apiVersion);
      expect(route.request().headers().authorization).toBe(`Bearer ${bearer}`);
      const request = route.request().postDataJSON() as { method: string; id: string; params: { message?: { messageId?: string }; id?: string } };
      if (request.method === "SendMessage") {
        expect(request).toEqual(sendRequest);
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(fixture.sendMessage) });
        return;
      }
      if (request.method === "GetTask") {
        expect(request.id).toBe("fixture-rpc-get");
        expect(request.params).toEqual({ id: fixture.sendMessage.result.task.id });
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(fixture.getTask) });
        return;
      }
    }
    if (url.pathname === "/") {
      await route.fulfill({ contentType: "text/html", body: "<!doctype html><title>fixture</title>" });
      return;
    }
    await route.fulfill({ status: 404, body: "not found" });
  });

  await page.goto("https://hermes.fixture.invalid/");
  const observed = await page.evaluate(async ({ request, fixtureBearer, fixtureVersion }) => {
    const sendResponse = await fetch("/", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${fixtureBearer}`,
        "A2A-Version": fixtureVersion,
      },
      body: JSON.stringify(request),
    });
    const send = await sendResponse.json();
    const getTaskResponse = await fetch("/", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${fixtureBearer}`,
        "A2A-Version": fixtureVersion,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "fixture-rpc-get",
        method: "GetTask",
        params: { id: send.result.task.id },
      }),
    });
    return { sendStatus: sendResponse.status, send, getTaskStatus: getTaskResponse.status, task: await getTaskResponse.json() };
  }, { request: sendRequest, fixtureBearer: bearer, fixtureVersion: apiVersion });

  expect(observed.sendStatus).toBe(200);
  expect(observed.getTaskStatus).toBe(200);
  expect(observed.send.id).toBe(sendRequest.id);
  expect(observed.send.result.task.id).toBe(fixture.sendMessage.result.task.id);
  expect(observed.task.id).toBe("fixture-rpc-get");
  expect(observed.task.result.id).toBe(observed.send.result.task.id);
  expect(observed.task.result.contextId).toBe(sendRequest.params.message.contextId);
  expect(observed.task.result.status.state).toBe("TASK_STATE_COMPLETED");
  expect(observed.send.result.task.artifacts[0].parts[0].text).toBe("fixture-result");
});

test("fixture-only Hermes JSON-RPC error retains the request id and no task result", async ({ page }) => {
  const errorRequest = {
    ...sendRequest,
    id: "fixture-rpc-error",
    params: { message: { ...sendRequest.params.message, messageId: "message-invalid-fixture" } },
  };
  await page.route("https://hermes.fixture.invalid/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/" && route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toEqual(errorRequest);
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(fixture.rpcError) });
      return;
    }
    if (url.pathname === "/") {
      await route.fulfill({ contentType: "text/html", body: "<!doctype html><title>fixture</title>" });
      return;
    }
    await route.fulfill({ status: 404, body: "not found" });
  });

  await page.goto("https://hermes.fixture.invalid/");
  const observed = await page.evaluate(async (request) => {
    const response = await fetch("/", {
      method: "POST",
      headers: { "content-type": "application/json", "A2A-Version": "1.0" },
      body: JSON.stringify(request),
    });
    return { status: response.status, body: await response.json() };
  }, errorRequest);

  expect(observed.status).toBe(200);
  expect(observed.body.id).toBe(errorRequest.id);
  expect(observed.body.error.code).toBe(-32602);
  expect(observed.body.result).toBeUndefined();
});
