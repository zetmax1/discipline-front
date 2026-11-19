import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// `npm run audit:check` audits the production tree (`npm audit --omit=dev`), so a package that
// only runs at build time must be a devDependency: in `dependencies` it drags its own build-time
// chain (tailwindcss → fast-glob/micromatch/picomatch, sucrase → glob/minimatch) into that audit.
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
const buildOnly = ['tailwindcss-animate'];

describe('package.json dependencies', () => {
  it.each(buildOnly)('keeps the build-time plugin %s out of the production tree', name => {
    expect(Object.keys(pkg.dependencies)).not.toContain(name);
    expect(Object.keys(pkg.devDependencies)).toContain(name);
  });
});
