/**
 * Fails on UI text written directly in components instead of through i18n (t()).
 * Checks JSX text, string literals rendered as JSX children (also inside ?:, &&, ||, templates),
 * UI attributes (placeholder, title, alt, aria-*, label, …) and toast()/toast.x() arguments.
 * Text without letters (numbers, "·", "–", "%") is allowed. Plain module data is not checked:
 * keep UI text in src/i18n/*.ts.
 */
const UI_ATTRIBUTES = new Set([
  'placeholder', 'title', 'alt', 'label', 'description', 'feature', 'tooltip', 'message', 'heading',
  'aria-label', 'aria-description', 'aria-valuetext', 'aria-placeholder', 'aria-roledescription',
]);
const LETTER = /\p{L}/u;

function hasLetters(node) {
  if (node.type === 'Literal') return typeof node.value === 'string' && LETTER.test(node.value);
  if (node.type === 'TemplateLiteral') return node.quasis.some(q => LETTER.test(q.value.cooked ?? ''));
  if (node.type === 'JSXText') return LETTER.test(node.value);
  return false;
}

/** Walks up through value-passing expressions to where a string ends up. */
function destination(node) {
  let child = node;
  let parent = node.parent;
  while (parent) {
    switch (parent.type) {
      case 'ConditionalExpression':
        if (parent.test === child) return null;
        break;
      case 'LogicalExpression':
      case 'TemplateLiteral':
      case 'TSAsExpression':
      case 'ParenthesizedExpression':
        break;
      case 'BinaryExpression':
        if (parent.operator !== '+') return null;
        break;
      case 'JSXExpressionContainer':
        return parent.parent;
      case 'Property':
        if (parent.value !== child) return null;
        return parent.parent?.type === 'ObjectExpression' && isToastCall(parent.parent.parent) && UI_KEYS.has(keyName(parent))
          ? parent.parent.parent
          : null;
      case 'CallExpression':
        return isToastCall(parent) ? parent : null;
      default:
        return null;
    }
    child = parent;
    parent = parent.parent;
  }
  return null;
}

const UI_KEYS = new Set(['title', 'description']);
const keyName = p => (p.key.type === 'Identifier' ? p.key.name : p.key.value);

function isToastCall(node) {
  if (!node || node.type !== 'CallExpression') return false;
  const c = node.callee;
  return (c.type === 'Identifier' && c.name === 'toast')
    || (c.type === 'MemberExpression' && c.object.type === 'Identifier' && c.object.name === 'toast');
}

function isUiTarget(target) {
  if (!target) return false;
  if (target.type === 'JSXElement' || target.type === 'JSXFragment' || target.type === 'CallExpression') return true;
  if (target.type === 'JSXAttribute') return UI_ATTRIBUTES.has(target.name.name);
  return false;
}

export default {
  meta: {
    type: 'problem',
    docs: { description: 'UI text goes through i18n (t()), not string literals' },
    messages: { literal: 'UI text must come from i18n: add a key to src/i18n/en.ts (+ uz, ru) and use t().' },
    schema: [],
  },
  create(context) {
    const report = node => context.report({ node, messageId: 'literal' });
    const check = node => {
      if (!hasLetters(node)) return;
      if (node.type === 'TemplateLiteral' && node.parent.type === 'TemplateLiteral') return;
      if (node.parent.type === 'JSXAttribute') {
        if (UI_ATTRIBUTES.has(node.parent.name.name)) report(node);
        return;
      }
      if (isUiTarget(destination(node))) report(node);
    };
    return {
      JSXText(node) {
        if (hasLetters(node)) report(node);
      },
      Literal: check,
      TemplateLiteral: check,
    };
  },
};
