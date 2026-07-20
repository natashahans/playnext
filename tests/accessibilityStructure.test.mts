import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function text(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("the document declares its language and a zoom-friendly viewport", async () => {
  const layout = await text("src/app/layout.tsx");
  assert.match(layout, /<html lang="en"/);
  assert.match(layout, /width:\s*"device-width"/);
  assert.doesNotMatch(layout, /userScalable:\s*false|max(?:imum)?Scale:\s*1/);
});

test("dashboard keyboard users can bypass repeated navigation", async () => {
  const layout = await text("src/app/dashboard/layout.tsx");
  assert.match(layout, /href="#dashboard-main-content"/);
  assert.match(layout, /id="dashboard-main-content"/);
  assert.match(layout, /tabIndex=\{-1\}/);
});

test("interactive controls have a visible keyboard focus treatment", async () => {
  const globalCss = await text("src/app/globals.css");
  const polishCss = await text("src/app/product-polish.css");
  assert.match(globalCss, /:focus-visible/);
  assert.match(polishCss, /dashboard-skip-link:focus/);
});

test("mobile form text remains large enough to prevent unwanted zoom", async () => {
  const css = await text("src/app/product-polish.css");
  assert.match(css, /@media \(max-width:\s*900px\)[\s\S]+font-size:\s*16px\s*!important/);
});

test("motion can be reduced at operating-system request", async () => {
  const styles = await Promise.all([
    "src/app/globals.css",
    "src/app/add-games.css",
    "src/app/dashboard-home.css",
    "src/app/decide-ai.css",
    "src/app/product-polish.css",
  ].map(text));
  for (const css of styles) assert.match(css, /prefers-reduced-motion:\s*reduce/);
});
