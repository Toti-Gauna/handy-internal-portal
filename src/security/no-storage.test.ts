import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

// AGENTS.md: no se guarda nada administrativo en el navegador (storage, cookies propias, IndexedDB ni URL).
const ROOT = new URL("..", import.meta.url).pathname;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return path.endsWith(".ts") && !path.endsWith(".test.ts") ? [path] : [];
  });
}

function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

test("el código de la app no usa localStorage, sessionStorage, document.cookie ni IndexedDB", () => {
  const forbidden = /\b(localStorage|sessionStorage|indexedDB|caches)\b|document\.cookie|history\.(pushState|replaceState)/;
  for (const file of sources(ROOT)) {
    assert.equal(forbidden.test(stripComments(readFileSync(file, "utf8"))), false, `${file} usa almacenamiento del navegador`);
  }
});

test("el csrfToken no viaja por la URL ni se escribe en el DOM", () => {
  for (const file of sources(ROOT)) {
    const code = stripComments(readFileSync(file, "utf8"));
    assert.equal(/csrf[A-Za-z]*\s*[=:][^;\n]*(location|innerHTML|setAttribute|searchParams)/i.test(code), false, file);
  }
});
