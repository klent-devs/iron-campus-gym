import { describe, expect, it } from 'vitest';
import {
  REMEMBERED_LOGIN_KEY,
  readRememberedLogin,
  saveRememberedLogin,
} from '../src/features/auth/rememberedLogin.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    data,
  };
}

const broken = {
  getItem() {
    throw new Error('blocked');
  },
  setItem() {
    throw new Error('blocked');
  },
  removeItem() {
    throw new Error('blocked');
  },
};

describe('remembered login', () => {
  it('remembers the username when Remember Me is ticked', () => {
    const s = memoryStorage();
    saveRememberedLogin('joy.frontdesk', true, s);
    expect(readRememberedLogin(s)).toBe('joy.frontdesk');
  });

  it('forgets it when Remember Me is unticked', () => {
    const s = memoryStorage();
    saveRememberedLogin('joy.frontdesk', true, s);
    saveRememberedLogin('joy.frontdesk', false, s);
    expect(s.data.has(REMEMBERED_LOGIN_KEY)).toBe(false);
    expect(readRememberedLogin(s)).toBe('');
  });

  it('keeps working when storage is missing or blocked', () => {
    expect(readRememberedLogin(null)).toBe('');
    expect(readRememberedLogin(broken)).toBe('');
    expect(() => saveRememberedLogin('joy', true, broken)).not.toThrow();
    expect(() => saveRememberedLogin('joy', true, null)).not.toThrow();
  });
});
