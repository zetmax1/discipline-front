import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// railway.json is Railway's config-as-code; it overrides the dashboard.
const root = join(__dirname, '..');
const railway = JSON.parse(readFileSync(join(root, 'railway.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

describe('railway.json', () => {
  it('starts the static server from package.json on $PORT', () => {
    expect(railway.deploy.startCommand).toBe('npm start');
    expect(pkg.scripts.start).toMatch(/^serve dist -s .*\$PORT/);
  });

  it('health-checks the SPA root, which serve -s answers with index.html', () => {
    expect(railway.deploy.healthcheckPath).toBe('/');
  });
});
