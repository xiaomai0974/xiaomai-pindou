import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const clientRoot = new URL("../dist/client/", import.meta.url);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

async function assetResponse(request) {
  const pathname = new URL(request.url).pathname.replace(/^\/+/, "");
  if (!pathname || pathname.includes("..")) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(new URL(pathname, clientRoot));
    const extension = pathname.slice(pathname.lastIndexOf("."));
    return new Response(body, {
      status: 200,
      headers: { "content-type": contentTypes[extension] || "application/octet-stream" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function fetchFromWorker(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`),
    { ASSETS: { fetch: assetResponse } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("serves the Xiaomai bead designer homepage", async () => {
  const response = await fetchFromWorker("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>小麦拼豆 Beta<\/title>/);
  assert.match(html, /id="patternCanvas"/);
  assert.match(html, /data-tool="pen"/);
  assert.match(html, /id="copySelectionButton"/);
  assert.match(html, /id="pasteSelectionButton"/);
});

test("serves the current application script and stylesheet", async () => {
  const [scriptResponse, styleResponse] = await Promise.all([
    fetchFromWorker("/app.js"),
    fetchFromWorker("/styles.css"),
  ]);
  assert.equal(scriptResponse.status, 200);
  assert.equal(styleResponse.status, 200);
  const script = await scriptResponse.text();
  assert.match(script, /function renderPattern\(\)/);
  assert.match(script, /function copySelectionPixels\(\)/);
  assert.match(await styleResponse.text(), /\.canvas-wrap/);
});
