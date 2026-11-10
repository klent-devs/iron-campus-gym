import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { generateQrToken } from '../src/lib/qrToken.js';
import { parseQrPayload, buildQrPayload } from '@icg/shared';

const fakeDb = (ok) => ({ raw: async () => (ok ? { rows: [1] } : Promise.reject(new Error('down'))) });

describe('GET /api/health', () => {
  it('reports database not configured when DATABASE_URL is missing', async () => {
    const res = await request(createApp({ db: null })).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'not_configured' });
  });

  it('reports the database as up', async () => {
    const res = await request(createApp({ db: fakeDb(true) })).get('/api/health');
    expect(res.body.database).toBe('up');
  });

  it('returns 503 when the database is down', async () => {
    const res = await request(createApp({ db: fakeDb(false) })).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', database: 'down' });
  });
});

describe('unknown routes', () => {
  it('return a friendly 404', async () => {
    const res = await request(createApp()).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Not found');
  });
});

describe('QR tokens', () => {
  it('are random, long enough and readable by the scanner', () => {
    const a = generateQrToken();
    const b = generateQrToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
    expect(parseQrPayload(buildQrPayload(a))).toBe(a);
  });
});
