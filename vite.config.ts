import 'dotenv/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

type LinkStatus = 'active' | 'used';

interface OneTimeLinkRecord {
  token: string;
  status: LinkStatus;
  createdAt: string;
  usedAt?: string;
  resultText?: string;
  participantName?: string;
}

interface OneTimeLinkStore {
  links: Record<string, OneTimeLinkRecord>;
}

interface SpinHistoryRecord {
  id: string;
  resultText: string;
  isLosing: boolean;
  linkToken: string;
  wheelOptionId: string;
  spunAt: string;
}

interface SpinHistoryStore {
  items: SpinHistoryRecord[];
}

const DATA_DIR = path.resolve(__dirname, '.data');
const LINKS_FILE = path.resolve(DATA_DIR, 'one-time-links.json');
const SPIN_HISTORY_FILE = path.resolve(DATA_DIR, 'spin-history.json');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'CasaOT';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'smokeshopot67';
const ADMIN_SESSION_COOKIE = 'ruleta_admin_session';
const ADMIN_SESSION_TTL_HOURS = Number(process.env.ADMIN_SESSION_TTL_HOURS || 8);
const ADMIN_SESSIONS = new Map<string, { username: string; expiresAt: number }>();

async function ensureStoreFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(LINKS_FILE);
  } catch {
    const initialStore: OneTimeLinkStore = { links: {} };
    await fs.writeFile(LINKS_FILE, JSON.stringify(initialStore, null, 2), 'utf-8');
  }
}

async function readStore(): Promise<OneTimeLinkStore> {
  await ensureStoreFile();
  try {
    const raw = await fs.readFile(LINKS_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as OneTimeLinkStore;
    if (!parsed || typeof parsed !== 'object' || !parsed.links) {
      return { links: {} };
    }
    return parsed;
  } catch {
    return { links: {} };
  }
}

async function writeStore(store: OneTimeLinkStore) {
  await ensureStoreFile();
  await fs.writeFile(LINKS_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

async function ensureSpinHistoryFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(SPIN_HISTORY_FILE);
  } catch {
    const initialStore: SpinHistoryStore = { items: [] };
    await fs.writeFile(SPIN_HISTORY_FILE, JSON.stringify(initialStore, null, 2), 'utf-8');
  }
}

async function readSpinHistoryStore(): Promise<SpinHistoryStore> {
  await ensureSpinHistoryFile();
  try {
    const raw = await fs.readFile(SPIN_HISTORY_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as SpinHistoryStore;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.items)) {
      return { items: [] };
    }
    return parsed;
  } catch {
    return { items: [] };
  }
}

async function writeSpinHistoryStore(store: SpinHistoryStore) {
  await ensureSpinHistoryFile();
  await fs.writeFile(SPIN_HISTORY_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

function makeToken() {
  return randomBytes(16).toString('hex');
}

function makeSpinHistoryId() {
  return `${Date.now()}-${randomBytes(8).toString('hex')}`;
}

async function readJsonBody(req: NodeJS.ReadableStream): Promise<any> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sendJson(res: any, code: number, data: unknown) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function resolveBaseUrl(req: any): string {
  const protoHeader = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(protoHeader)
    ? protoHeader[0]
    : (protoHeader || 'http');
  const host = req.headers.host || 'localhost:3000';
  return `${proto}://${host}`;
}

function parseCookies(req: any): Record<string, string> {
  const raw = req.headers.cookie || '';
  const parsed: Record<string, string> = {};

  for (const chunk of raw.split(';')) {
    const [key, ...rest] = chunk.trim().split('=');
    if (!key) continue;
    parsed[key] = decodeURIComponent(rest.join('=') || '');
  }

  return parsed;
}

function clearExpiredAdminSessions() {
  const now = Date.now();
  for (const [token, session] of ADMIN_SESSIONS.entries()) {
    if (!session || session.expiresAt <= now) {
      ADMIN_SESSIONS.delete(token);
    }
  }
}

function createAdminSession() {
  clearExpiredAdminSessions();
  const token = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + ADMIN_SESSION_TTL_HOURS * 60 * 60 * 1000;
  ADMIN_SESSIONS.set(token, { username: ADMIN_USERNAME, expiresAt });
  return { token, expiresAt };
}

function getAdminSession(req: any) {
  clearExpiredAdminSessions();
  const cookies = parseCookies(req);
  const token = cookies[ADMIN_SESSION_COOKIE];
  if (!token) return null;

  const session = ADMIN_SESSIONS.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    ADMIN_SESSIONS.delete(token);
    return null;
  }

  return { token, ...session };
}

function setAdminCookie(res: any, token: string) {
  const maxAgeSeconds = ADMIN_SESSION_TTL_HOURS * 60 * 60;
  res.setHeader(
    'Set-Cookie',
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`,
  );
}

function clearAdminCookie(res: any) {
  res.setHeader(
    'Set-Cookie',
    `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}

function ensureAdmin(req: any, res: any): boolean {
  const session = getAdminSession(req);
  if (!session) {
    clearAdminCookie(res);
    sendJson(res, 401, { ok: false, reason: 'admin_auth_required' });
    return false;
  }
  return true;
}

async function recordSpinHistory(entry: {
  resultText: string;
  isLosing: boolean;
  linkToken: string;
  wheelOptionId: string;
  spunAt: string;
}) {
  const store = await readSpinHistoryStore();
  const record: SpinHistoryRecord = {
    id: makeSpinHistoryId(),
    resultText: entry.resultText,
    isLosing: entry.isLosing,
    linkToken: entry.linkToken,
    wheelOptionId: entry.wheelOptionId,
    spunAt: entry.spunAt,
  };

  store.items.unshift(record);
  await writeSpinHistoryStore(store);
  return record;
}

async function listSpinHistory(limit: number) {
  const store = await readSpinHistoryStore();
  return store.items.slice(0, limit);
}

function oneTimeLinksApiPlugin(): Plugin {
  const handler = async (req: any, res: any, next: () => void) => {
    const fullUrl = req.url || '';
    const url = fullUrl.split('?')[0];
    const method = req.method || 'GET';

    if (url === '/api/admin/login' && method === 'POST') {
      const body = await readJsonBody(req);
      const username = typeof body?.username === 'string' ? body.username.trim() : '';
      const password = typeof body?.password === 'string' ? body.password : '';

      if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
        sendJson(res, 401, { ok: false, reason: 'invalid_credentials' });
        return;
      }

      const session = createAdminSession();
      setAdminCookie(res, session.token);
      sendJson(res, 200, {
        ok: true,
        username: ADMIN_USERNAME,
        expiresAt: new Date(session.expiresAt).toISOString(),
      });
      return;
    }

    if (url === '/api/admin/session' && method === 'GET') {
      const session = getAdminSession(req);
      if (!session) {
        clearAdminCookie(res);
        sendJson(res, 200, { ok: true, authenticated: false });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        authenticated: true,
        username: session.username,
        expiresAt: new Date(session.expiresAt).toISOString(),
      });
      return;
    }

    if (url === '/api/admin/logout' && method === 'POST') {
      const session = getAdminSession(req);
      if (session?.token) {
        ADMIN_SESSIONS.delete(session.token);
      }
      clearAdminCookie(res);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url === '/api/one-time-links' && method === 'GET') {
      if (!ensureAdmin(req, res)) return;

      const base = resolveBaseUrl(req);
      const parsed = new URL(fullUrl, base);
      const limitRaw = Number(parsed.searchParams.get('limit') || '20');
      const limit = Math.max(1, Math.min(limitRaw, 100));
      const store = await readStore();
      const values = Object.values(store.links || {}).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      sendJson(res, 200, {
        ok: true,
        storage: 'file',
        items: values.slice(0, limit).map((item) => ({
          token: item.token,
          status: item.status,
          createdAt: item.createdAt,
          usedAt: item.usedAt || null,
          resultText: item.resultText || '',
          participantName: item.participantName || '',
        })),
      });
      return;
    }

    if (url === '/api/one-time-links/create' && method === 'POST') {
      if (!ensureAdmin(req, res)) return;

      const store = await readStore();
      const token = makeToken();
      const nowIso = new Date().toISOString();

      store.links[token] = {
        token,
        status: 'active',
        createdAt: nowIso,
      };

      await writeStore(store);

      const baseUrl = resolveBaseUrl(req);
      sendJson(res, 200, {
        ok: true,
        token,
        createdAt: nowIso,
        status: 'active',
        url: `${baseUrl}/?token=${encodeURIComponent(token)}`,
      });
      return;
    }

    if (url === '/api/spin-history' && method === 'POST') {
      const body = await readJsonBody(req);
      const record = await recordSpinHistory({
        resultText: typeof body?.resultText === 'string' ? body.resultText : '',
        isLosing: Boolean(body?.isLosing),
        linkToken: typeof body?.linkToken === 'string' ? body.linkToken : '',
        wheelOptionId: typeof body?.wheelOptionId === 'string' ? body.wheelOptionId : '',
        spunAt: typeof body?.spunAt === 'string' ? body.spunAt : new Date().toISOString(),
      });

      sendJson(res, 200, { ok: true, storage: 'file', record });
      return;
    }

    if (url === '/api/spin-history' && method === 'GET') {
      if (!ensureAdmin(req, res)) return;

      const base = resolveBaseUrl(req);
      const parsed = new URL(fullUrl, base);
      const limitRaw = Number(parsed.searchParams.get('limit') || '20');
      const limit = Math.max(1, Math.min(limitRaw, 100));
      const items = await listSpinHistory(limit);

      sendJson(res, 200, { ok: true, storage: 'file', items });
      return;
    }

    const statusMatch = url.match(/^\/api\/one-time-links\/([a-z0-9]+)\/status$/i);
    if (statusMatch && method === 'GET') {
      const token = decodeURIComponent(statusMatch[1]);
      const store = await readStore();
      const record = store.links[token];

      if (!record) {
        sendJson(res, 404, { ok: false, reason: 'not_found' });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        status: record.status,
        createdAt: record.createdAt,
        usedAt: record.usedAt || null,
        resultText: record.resultText || null,
        participantName: record.participantName || null,
      });
      return;
    }

    const consumeMatch = url.match(/^\/api\/one-time-links\/([a-z0-9]+)\/consume$/i);
    if (consumeMatch && method === 'POST') {
      const token = decodeURIComponent(consumeMatch[1]);
      const body = await readJsonBody(req);
      const store = await readStore();
      const record = store.links[token];

      if (!record) {
        sendJson(res, 404, { ok: false, reason: 'not_found' });
        return;
      }

      if (record.status === 'used') {
        sendJson(res, 409, {
          ok: false,
          reason: 'already_used',
          usedAt: record.usedAt || null,
        });
        return;
      }

      record.status = 'used';
      record.usedAt = new Date().toISOString();
      record.resultText = typeof body?.resultText === 'string' ? body.resultText : '';
      record.participantName = typeof body?.participantName === 'string' ? body.participantName : '';
      store.links[token] = record;

      await writeStore(store);
      sendJson(res, 200, { ok: true, status: 'used', usedAt: record.usedAt });
      return;
    }

    next();
  };

  return {
    name: 'one-time-links-api',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), oneTimeLinksApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
