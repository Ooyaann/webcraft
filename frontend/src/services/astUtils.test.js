import { describe, it, expect } from 'vitest';
import { toHTML } from './astUtils';

describe('toHTML XSS hardening', () => {
  it('escapes the img src attribute to prevent breakout', () => {
    const out = toHTML([{ type: 'img', content: 'x" onerror="alert(1)' }]);
    // The double quote is escaped, so onerror stays inside the src value.
    expect(out).not.toMatch(/onerror="alert/);
    expect(out).toContain('&quot;');
  });

  it('drops dangerous URL schemes in img src', () => {
    const out = toHTML([{ type: 'img', content: 'javascript:alert(1)' }]);
    expect(out).not.toContain('javascript:');
  });

  it('never emits a tag for an unknown/untrusted node type', () => {
    const out = toHTML([{ type: 'script', content: 'alert(1)' }]);
    expect(out).not.toMatch(/<script/i);
  });

  it('neutralizes </style> breakout inside style content', () => {
    const out = toHTML([{ type: 'style', content: '</style><img src=x onerror=alert(1)>' }]);
    expect(out).not.toMatch(/<\/style>\s*<img/i);
  });

  it('escapes text content of leaf tags', () => {
    const out = toHTML([{ type: 'h1', content: '<b>hi</b>' }]);
    expect(out).toContain('&lt;b&gt;hi&lt;/b&gt;');
  });

  it('renders valid containers and http image sources', () => {
    const out = toHTML([{ type: 'body', children: [{ type: 'img', content: 'https://ex.com/a.png' }] }]);
    expect(out).toContain('<body>');
    expect(out).toContain('src="https://ex.com/a.png"');
  });
});
