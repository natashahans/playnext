import test from "node:test";
import assert from "node:assert/strict";
import { protectApi } from "../src/lib/api-security.ts";

const options = { bucket: "test", limit: 2, windowMs: 60_000 };

test("protected APIs reject requests without a bearer token", async () => {
  const result = await protectApi(new Request("http://localhost/api/test"), options);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.response.status, 401);
    assert.deepEqual(await result.response.json(), { error: "Authentication required." });
  }
});

test("protected APIs reject malformed authorization headers", async () => {
  const request = new Request("http://localhost/api/test", {
    headers: { Authorization: "Basic definitely-not-a-session" },
  });
  const result = await protectApi(request, options);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.response.status, 401);
});

test("unreasonably large bearer tokens are rejected before authentication", async () => {
  const request = new Request("http://localhost/api/test", {
    headers: { Authorization: `Bearer ${"x".repeat(4097)}` },
  });
  const result = await protectApi(request, options);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.response.status, 401);
});
