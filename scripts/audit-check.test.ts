import { describe, it, expect } from 'vitest';
import { checkAudit } from './audit-check.mjs';

const audit = (...ids: string[]) => ({
  vulnerabilities: {
    'react-router': {
      via: ids.map(id => ({ url: `https://github.com/advisories/${id}`, title: `t ${id}`, severity: 'moderate' })),
    },
    'react-router-dom': { via: ['react-router'] }, // transitive: covered by react-router's advisories
  },
});
const allow = (...ids: string[]) => ids.map(id => ({ id, package: 'react-router', reason: 'r', reviewed: '2026-10-30' }));

describe('checkAudit', () => {
  it('passes when every advisory is allowlisted', () => {
    expect(checkAudit(audit('GHSA-aaaa'), allow('GHSA-aaaa'))).toEqual({ unexpected: [], stale: [] });
  });

  it('fails on any advisory that is not allowlisted', () => {
    const { unexpected } = checkAudit(audit('GHSA-aaaa', 'GHSA-new1'), allow('GHSA-aaaa'));
    expect(unexpected.map(a => a.id)).toEqual(['GHSA-new1']);
  });

  it('reports allowlist entries that no longer match, so they get removed', () => {
    expect(checkAudit(audit(), allow('GHSA-gone')).stale.map(e => e.id)).toEqual(['GHSA-gone']);
  });

  it('passes on a clean audit with an empty allowlist', () => {
    expect(checkAudit({ vulnerabilities: {} }, [])).toEqual({ unexpected: [], stale: [] });
  });
});
