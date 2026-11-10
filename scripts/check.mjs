// Quick sanity check for the single-file proposal page. No dependencies.
// Run from the project root:  node scripts/check.mjs
//   --fix-csp   rewrite the Content-Security-Policy script hash to match the current inline script
// Exits 1 and lists the problems if anything is broken, prints "check: OK" otherwise.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { Script } from "node:vm";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "index.html");
const raw = readFileSync(file, "utf8");
// Browsers turn CRLF into LF before hashing scripts, so compare on the same text.
const html = raw.replace(/\r\n?/g, "\n");
const problems = [];

// 1. Inline scripts parse (compiled, not run).
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (!inline.length) problems.push("index.html has no inline <script>");
inline.forEach((code, i) => {
  try { new Script(code, { filename: `index.html <script #${i + 1}>` }); }
  catch (e) { problems.push(`inline script #${i + 1} does not parse: ${e.message}\n${(e.stack || "").split("\n").slice(0, 3).join("\n")}`); }
});

// 2. The CSP script hash matches the inline script, or the browser blocks the whole script.
const hashes = inline.map(code => createHash("sha256").update(code).digest("base64"));
const cspHashes = [...html.matchAll(/'sha256-([A-Za-z0-9+/=]+)'/g)].map(m => m[1]);
if (cspHashes.length) {
  const stale = hashes.filter(h => !cspHashes.includes(h));
  if (stale.length && process.argv.includes("--fix-csp") && cspHashes.length === 1 && hashes.length === 1) {
    writeFileSync(file, raw.replace(`'sha256-${cspHashes[0]}'`, `'sha256-${hashes[0]}'`));
    console.log(`check: CSP hash updated to sha256-${hashes[0]}`);
  } else if (stale.length) {
    problems.push(`CSP script hash is stale: the page's script would be blocked. Run: node scripts/check.mjs --fix-csp`);
  }
}

// 3. Local files referenced by the page exist.
for (const [, ref] of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
  const path = ref.split(/[?#]/)[0];
  if (path && !/^(https?:|mailto:|tel:|data:|\/\/|#)/.test(ref) && !existsSync(join(root, path)))
    problems.push(`missing file: ${path}`);
}

// 4. In-page anchors point at ids that exist.
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
for (const [, id] of html.matchAll(/href="#([^"]+)"/g))
  if (!ids.has(id)) problems.push(`link to #${id}, but no element has id="${id}"`);

// 5. CSS braces balance in each <style> block (comments and strings ignored).
[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].forEach(([, css], i) => {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "");
  let depth = 0;
  for (const ch of code) { if (ch === "{") depth++; if (ch === "}" && --depth < 0) break; }
  if (depth !== 0) problems.push(`<style> block #${i + 1} has unbalanced braces (${depth > 0 ? "missing }" : "extra }"})`);
});

// 6. Document skeleton is intact.
for (const tag of ["<!doctype html>", "</head>", "<body", "</body>", "</html>"])
  if (!html.toLowerCase().includes(tag)) problems.push(`index.html is missing ${tag}`);

if (problems.length) {
  console.error(`check: ${problems.length} problem(s)\n- ` + problems.join("\n- "));
  process.exit(1);
}
console.log("check: OK");
