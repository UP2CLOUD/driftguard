#!/usr/bin/env node
/**
 * i18n validation — runs at build time (prebuild) and in CI.
 * Zero dependencies: plain Node ESM so it works without tsx/ts-node.
 * Exit 0 on pass, 1 on failure.
 *
 *   node scripts/validate-i18n.mjs
 *
 * Checks every messages/<locale>.json against the base locale (en):
 *   - MISSING keys      → error (fails build)
 *   - EMPTY values      → error
 *   - placeholder drift → error (a locale dropped a {var} present in en)
 *   - EXTRA keys        → warning
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MESSAGES_DIR = join(process.cwd(), "messages");
const BASE_LOCALE = "en";

function flatten(obj, prefix = "") {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = String(v ?? "");
    }
  }
  return out;
}

function interpolations(s) {
  return [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

const errors = [];
const warns = [];

const locales = {};
for (const file of readdirSync(MESSAGES_DIR).filter((f) => f.endsWith(".json"))) {
  locales[file.replace(".json", "")] = flatten(
    JSON.parse(readFileSync(join(MESSAGES_DIR, file), "utf-8"))
  );
}

const base = locales[BASE_LOCALE];
if (!base) {
  console.error(`No base locale ${BASE_LOCALE}`);
  process.exit(1);
}

console.log(`Base (${BASE_LOCALE}): ${Object.keys(base).length} keys`);

for (const [loc, msgs] of Object.entries(locales)) {
  if (loc === BASE_LOCALE) continue;
  const keys = new Set(Object.keys(msgs));
  Object.keys(base)
    .filter((k) => !keys.has(k))
    .forEach((k) => errors.push(`[${loc}] MISSING: ${k}`));
  [...keys]
    .filter((k) => !(k in base))
    .forEach((k) => warns.push(`[${loc}] EXTRA: ${k}`));
}

for (const [loc, msgs] of Object.entries(locales)) {
  Object.entries(msgs)
    .filter(([, v]) => v === "")
    .forEach(([k]) => errors.push(`[${loc}] EMPTY: ${k}`));
}

for (const [key, baseVal] of Object.entries(base)) {
  const baseVars = interpolations(baseVal);
  if (!baseVars.length) continue;
  for (const [loc, msgs] of Object.entries(locales)) {
    if (loc === BASE_LOCALE || !msgs[key]) continue;
    const locVars = interpolations(msgs[key]);
    baseVars
      .filter((v) => !locVars.includes(v))
      .forEach((v) => errors.push(`[${loc}] "${key}" missing {${v}}`));
  }
}

if (warns.length) {
  console.warn("\n⚠  WARNINGS:");
  warns.forEach((w) => console.warn("  " + w));
}
if (errors.length) {
  console.error(`\n❌ ERRORS (${errors.length}):`);
  errors.forEach((e) => console.error("  " + e));
  process.exit(1);
}

console.log(
  `\n✅ PASS — ${Object.keys(locales).length} locales, ${Object.keys(base).length} keys, ${warns.length} warnings`
);
