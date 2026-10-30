// Runs `npm audit --omit=dev` and fails on any advisory that is not in
// audit-allowlist.json, and on allowlist entries that no longer match (so the
// list only ever holds advisories that still apply and were reviewed).
//   node scripts/audit-check.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Advisory IDs (GHSA-…) reported by an `npm audit --json` result. */
function advisories(audit) {
  const found = new Map();
  for (const [pkg, vuln] of Object.entries(audit.vulnerabilities ?? {})) {
    for (const via of vuln.via ?? []) {
      if (typeof via !== 'object' || !via.url) continue; // a string names another vulnerable package
      const id = via.url.split('/').pop();
      found.set(id, { id, package: pkg, title: via.title, severity: via.severity });
    }
  }
  return [...found.values()];
}

/** Compares an audit result with the allowlist. */
export function checkAudit(audit, allowlist) {
  const found = advisories(audit);
  const allowed = new Set(allowlist.map(e => e.id));
  const foundIds = new Set(found.map(a => a.id));
  return {
    unexpected: found.filter(a => !allowed.has(a.id)),
    stale: allowlist.filter(e => !foundIds.has(e.id)),
  };
}

function main() {
  const dir = fileURLToPath(new URL('..', import.meta.url));
  let raw;
  try {
    raw = execFileSync('npm', ['audit', '--omit=dev', '--json'], { cwd: dir, encoding: 'utf8' });
  } catch (err) {
    raw = err.stdout; // npm audit exits non-zero when it finds anything
  }
  const allowlist = JSON.parse(readFileSync(new URL('../audit-allowlist.json', import.meta.url), 'utf8')).advisories;
  const { unexpected, stale } = checkAudit(JSON.parse(raw), allowlist);
  for (const a of unexpected) console.error(`NOT ALLOWED  ${a.id} ${a.severity} ${a.package}: ${a.title}`);
  for (const e of stale) console.error(`STALE ENTRY  ${e.id} (${e.package}) no longer reported; remove it from audit-allowlist.json`);
  if (unexpected.length || stale.length) process.exit(1);
  console.log(`npm audit --omit=dev: only allowlisted advisories (${allowlist.length}), each reviewed`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
