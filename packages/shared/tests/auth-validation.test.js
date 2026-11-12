import { describe, expect, it } from 'vitest';
import { staffLoginSchema } from '../src/index.js';

const messages = (input) => {
  const r = staffLoginSchema.safeParse(input);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
};

describe('staffLoginSchema', () => {
  it('accepts a username and password, trims the username, keeps Remember Me on by default', () => {
    const r = staffLoginSchema.parse({ login: '  joy.frontdesk ', password: ' secret ' });
    expect(r).toEqual({ login: 'joy.frontdesk', password: ' secret ', rememberMe: true });
  });

  it('accepts an email', () => {
    expect(
      staffLoginSchema.safeParse({ login: 'owner@ironcampus.ph', password: 'x' }).success,
    ).toBe(true);
  });

  it('gives plain messages for blank fields', () => {
    expect(messages({ login: '   ', password: '' })).toEqual({
      login: 'Enter your username or email',
      password: 'Enter your password',
    });
    expect(messages({})).toEqual({
      login: 'Enter your username or email',
      password: 'Enter your password',
    });
  });

  it('keeps Remember Me off when unticked', () => {
    expect(
      staffLoginSchema.parse({ login: 'a', password: 'b', rememberMe: false }).rememberMe,
    ).toBe(false);
  });
});
