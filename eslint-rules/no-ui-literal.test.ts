import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, it } from 'vitest';
import rule from './no-ui-literal.js';

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
});

tester.run('no-ui-literal', rule, {
  valid: [
    'const a = <p>{t("x.y")}</p>;',
    'const a = <p className="text-sm font-bold" data-testid="score">{value}</p>;',
    'const a = <p>{count} · {total}</p>;',
    'const a = <p>404 – {n}%</p>;',
    'const a = <Input type="email" autoComplete="email" id="email" />;',
    'const a = <p>{ok ? t("a") : t("b")}</p>;',
    'const a = <p className={cn("flex", ok && "opacity-60")}>{t("a")}</p>;',
    'toast(t("planner.added"));',
    'toast.error(errorMessage(err, "planner.saveFailed"));',
    'const s = { label: "not UI" };', // plain module data is out of scope (dictionaries by convention)
    'const a = <p>{/* comment */}</p>;',
  ],
  invalid: [
    { code: 'const a = <p>Hello</p>;', errors: [{ messageId: 'literal' }] },
    { code: 'const a = <p>{"Hello"}</p>;', errors: [{ messageId: 'literal' }] },
    { code: 'const a = <p>{ok ? "Sign in" : "Create account"}</p>;', errors: [{ messageId: 'literal' }, { messageId: 'literal' }] },
    { code: 'const a = <p>{`Tasks ${n}`}</p>;', errors: [{ messageId: 'literal' }] },
    { code: 'const a = <Input placeholder="Task name" />;', errors: [{ messageId: 'literal' }] },
    { code: 'const a = <button title="Skip" aria-label="Skip block" />;', errors: [{ messageId: 'literal' }, { messageId: 'literal' }] },
    { code: 'const a = <img alt={"Focus"} />;', errors: [{ messageId: 'literal' }] },
    { code: 'const a = <DemoUnavailable feature="Analytics" />;', errors: [{ messageId: 'literal' }] },
    { code: 'toast("Block added.");', errors: [{ messageId: 'literal' }] },
    { code: 'toast.error(err.message || "Could not save");', errors: [{ messageId: 'literal' }] },
    { code: 'toast({ title: "Saved", description: `Saved ${n}` });', errors: [{ messageId: 'literal' }, { messageId: 'literal' }] },
  ],
});
