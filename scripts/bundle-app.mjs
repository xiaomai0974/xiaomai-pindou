import assert from "node:assert/strict";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const appDirectory = path.resolve("public/app");
const outputFile = path.resolve("public/app.js");
const expectedParts = [
  "01-runtime.js",
  "02-ui.js",
  "03-project.js",
  "04-transform.js",
  "05-editor.js",
  "06-export.js",
  "07-boot.js",
];

const parts = (await readdir(appDirectory))
  .filter((name) => name.endsWith(".js"))
  .sort();

assert.deepEqual(parts, expectedParts, "Application parts or their load order changed unexpectedly.");

const source = (
  await Promise.all(parts.map((name) => readFile(path.join(appDirectory, name), "utf8")))
).join("\n");

await writeFile(outputFile, source);
console.log(`Bundled ${parts.length} application parts into public/app.js.`);
