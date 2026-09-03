import { describe, expect, it } from 'vitest';
import { readCookie } from './cookies.js';

describe('cookie parsing', () => {
  it('reads only the requested encoded cookie', () => {
    expect(readCookie('theme=dark; studytube_session=a%2Fb%2Bc; other=1', 'studytube_session')).toBe('a/b+c');
  });

  it('rejects a malformed cookie value', () => {
    expect(readCookie('studytube_session=%E0%A4%A', 'studytube_session')).toBeUndefined();
  });
});
