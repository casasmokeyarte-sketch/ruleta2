import "dotenv/config";
import express from "express";
import { randomBytes, timingSafeEqual, scryptSync } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

const DATA_DIR = path.resolve(__dirname, ".data");
const LINKS_FILE = path.resolve(DATA_DIR, "one-time-links.json");
const SPIN_HISTORY_FILE = path.resolve(DATA_DIR, "spin-history.json");
const DIST_DIR = path.resolve(__dirname, "dist");

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || "one_time_links";
const SPIN_HISTORY_TABLE = process.env.SPIN_HISTORY_TABLE || "spin_history";
const LINK_TTL_HOURS = Number(process.env.LINK_TTL_HOURS || 24);
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || "CasaOT").trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "smokeshopot67";
const ADMIN_PASSWORD_HASH = (process.env.ADMIN_PASSWORD_HASH || "").trim();
const ADMIN_SESSION_COOKIE = "ruleta_admin_session";
const ADMIN_SESSION_TTL_HOURS = Number(process.env.ADMIN_SESSION_TTL_HOURS || 8);
const ADMIN_COOKIE_SECURE = process.env.ADMIN_COOKIE_SECURE || "auto";
const ADMIN_SESSIONS = new Map();

typeCheck();

app.use(express.json());

async function ensureStoreFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(LINKS_FILE);
  } catch {
    await fs.writeFile(LINKS_FILE, JSON.stringify({ links: {} }, null, 2), "utf-8");
  }
}

async function readStore() {
  await ensureStoreFile();
  try {
    const raw = await fs.readFile(LINKS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.links) {
      return { links: {} };
    }
    return parsed;
  } catch {
    return { links: {} };
  }
}

async function writeStore(store) {
  await ensureStoreFile();
  await fs.writeFile(LINKS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

async function ensureSpinHistoryFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(SPIN_HISTORY_FILE);
  } catch {
    await fs.writeFile(SPIN_HISTORY_FILE, JSON.stringify({ items: [] }, null, 2), "utf-8");
  }
}

async function readSpinHistoryStore() {
  await ensureSpinHistoryFile();
  try {
    const raw = await fs.readFile(SPIN_HISTORY_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) {
      return { items: [] };
    }
    return parsed;
  } catch {
    return { items: [] };
  }
}

async function writeSpinHistoryStore(store) {
  await ensureSpinHistoryFile();
  await fs.writeFile(SPIN_HISTORY_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function mapSupabaseRow(row) {
  if (!row) return null;
  return {
    token: row.token,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at || null,
    usedAt: row.used_at || null,
    resultText: row.result_text || "",
    participantName: row.participant_name || "",
  };
}

function calcExpiresAt(createdAtIso) {
  const createdAtMs = new Date(createdAtIso).getTime();
  return new Date(createdAtMs + LINK_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

function normalizeRecord(record) {
  if (!record) return null;
  return {
    ...record,
    expiresAt: record.expiresAt || calcExpiresAt(record.createdAt),
  };
}

function isExpired(record) {
  const normalized = normalizeRecord(record);
  if (!normalized) return false;
  return normalized.status !== "used" && Date.now() > new Date(normalized.expiresAt).getTime();
}

function effectiveStatus(record) {
  if (!record) return "not_found";
  if (record.status === "used") return "used";
  if (record.status === "expired") return "expired";
  return isExpired(record) ? "expired" : "active";
}

function mapSpinHistoryRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    resultText: row.result_text || "",
    isLosing: Boolean(row.is_losing),
    linkToken: row.link_token || "",
    wheelOptionId: row.wheel_option_id || "",
    participantId: row.participant_id || null,
    spunAt: row.spun_at,
  };
}

async function supabaseRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase error ${response.status}: ${text}`);
  }

  if (!text) return null;
  return JSON.parse(text);
}

async function createLinkRecord(token, nowIso) {
  const expiresAt = calcExpiresAt(nowIso);

  if (!USE_SUPABASE) {
    const store = await readStore();
    store.links[token] = {
      token,
      status: "active",
      createdAt: nowIso,
      expiresAt,
    };
    await writeStore(store);
    return store.links[token];
  }

  const rows = await supabaseRequest(
    `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=*`,
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([
        {
          token,
          status: "active",
          created_at: nowIso,
          expires_at: expiresAt,
        },
      ]),
    },
  );

  return mapSupabaseRow(Array.isArray(rows) ? rows[0] : null);
}

async function getLinkRecord(token) {
  if (!USE_SUPABASE) {
    const store = await readStore();
    const raw = store.links[token] || null;
    const normalized = normalizeRecord(raw);

    if (normalized && raw && !raw.expiresAt) {
      store.links[token] = normalized;
      await writeStore(store);
    }

    if (normalized && isExpired(normalized) && normalized.status !== "expired") {
      normalized.status = "expired";
      store.links[token] = normalized;
      await writeStore(store);
    }

    return normalized;
  }

  const rows = await supabaseRequest(
    `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?token=eq.${encodeURIComponent(token)}&select=*`,
    { method: "GET" },
  );

  return normalizeRecord(mapSupabaseRow(Array.isArray(rows) ? rows[0] : null));
}

async function listLinkRecords(limit = 20) {
  if (!USE_SUPABASE) {
    const store = await readStore();
    const values = Object.values(store.links || {}).map(normalizeRecord);
    values.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let changed = false;
    for (const item of values) {
      if (isExpired(item) && item.status !== "expired") {
        item.status = "expired";
        store.links[item.token] = item;
        changed = true;
      }
    }
    if (changed) {
      await writeStore(store);
    }

    return values.slice(0, limit);
  }

  const rows = await supabaseRequest(
    `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?select=*&order=created_at.desc&limit=${Math.max(1, Math.min(limit, 100))}`,
    { method: "GET" },
  );

  return (Array.isArray(rows) ? rows : []).map((row) => normalizeRecord(mapSupabaseRow(row)));
}

async function consumeLinkRecord(token, resultText, participantName) {
  if (!USE_SUPABASE) {
    const store = await readStore();
    const record = normalizeRecord(store.links[token]);

    if (!record) return { ok: false, reason: "not_found" };
    if (isExpired(record)) {
      record.status = "expired";
      store.links[token] = record;
      await writeStore(store);
      return { ok: false, reason: "expired", expiresAt: record.expiresAt };
    }
    if (record.status === "used") {
      return { ok: false, reason: "already_used", usedAt: record.usedAt || null };
    }

    record.status = "used";
    record.usedAt = new Date().toISOString();
    record.resultText = resultText;
    record.participantName = participantName;
    store.links[token] = record;
    await writeStore(store);

    return { ok: true, record };
  }

  const usedAt = new Date().toISOString();
  const rows = await supabaseRequest(
    `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?token=eq.${encodeURIComponent(token)}&status=eq.active&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "used",
        used_at: usedAt,
        result_text: resultText,
        participant_name: participantName,
      }),
    },
  );

  if (Array.isArray(rows) && rows.length > 0) {
    return { ok: true, record: mapSupabaseRow(rows[0]) };
  }

  const existing = await getLinkRecord(token);
  if (!existing) return { ok: false, reason: "not_found" };
  if (isExpired(existing)) return { ok: false, reason: "expired", expiresAt: existing.expiresAt };
  return { ok: false, reason: "already_used", usedAt: existing.usedAt || null };
}

async function recordSpinHistory(entry) {
  const normalized = {
    resultText: typeof entry?.resultText === "string" ? entry.resultText : "",
    isLosing: Boolean(entry?.isLosing),
    linkToken: typeof entry?.linkToken === "string" ? entry.linkToken : "",
    wheelOptionId: typeof entry?.wheelOptionId === "string" ? entry.wheelOptionId : "",
    participantId: null,
    spunAt: typeof entry?.spunAt === "string" ? entry.spunAt : new Date().toISOString(),
  };

  if (!USE_SUPABASE) {
    const store = await readSpinHistoryStore();
    const record = {
      id: `${Date.now()}-${randomBytes(8).toString("hex")}`,
      ...normalized,
    };
    store.items.unshift(record);
    await writeSpinHistoryStore(store);
    return record;
  }

  const rows = await supabaseRequest(
    `${SUPABASE_URL}/rest/v1/${SPIN_HISTORY_TABLE}?select=*`,
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([
        {
          participant_id: null,
          wheel_option_id: normalized.wheelOptionId || null,
          link_token: normalized.linkToken || null,
          result_text: normalized.resultText,
          is_losing: normalized.isLosing,
          spun_at: normalized.spunAt,
        },
      ]),
    },
  );

  return mapSpinHistoryRow(Array.isArray(rows) ? rows[0] : null);
}

async function listSpinHistory(limit = 20) {
  if (!USE_SUPABASE) {
    const store = await readSpinHistoryStore();
    return store.items.slice(0, limit);
  }

  const rows = await supabaseRequest(
    `${SUPABASE_URL}/rest/v1/${SPIN_HISTORY_TABLE}?select=*&order=spun_at.desc&limit=${Math.max(1, Math.min(limit, 100))}`,
    { method: "GET" },
  );

  return (Array.isArray(rows) ? rows : []).map((row) => mapSpinHistoryRow(row));
}

function makeToken() {
  return randomBytes(16).toString("hex");
}

function resolveBaseUrl(req) {
  const protoHeader = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : (protoHeader || req.protocol || "http");
  const host = req.headers.host || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function safeCompare(a, b) {
  const aBuffer = Buffer.from(String(a));
  const bBuffer = Buffer.from(String(b));
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

function verifyScryptHash(password, hashValue) {
  if (!hashValue || !hashValue.startsWith("scrypt$")) return false;

  const parts = hashValue.split("$");
  if (parts.length !== 3) return false;

  const saltHex = parts[1];
  const expectedHashHex = parts[2];
  if (!saltHex || !expectedHashHex) return false;

  let expectedBuffer;
  let calculatedBuffer;

  try {
    expectedBuffer = Buffer.from(expectedHashHex, "hex");
    if (expectedBuffer.length === 0) return false;
    calculatedBuffer = scryptSync(password, Buffer.from(saltHex, "hex"), expectedBuffer.length);
  } catch {
    return false;
  }

  return timingSafeEqual(calculatedBuffer, expectedBuffer);
}

function verifyAdminPassword(password) {
  if (ADMIN_PASSWORD_HASH && ADMIN_PASSWORD_HASH.startsWith("scrypt$")) {
    return verifyScryptHash(password, ADMIN_PASSWORD_HASH);
  }

  if (ADMIN_PASSWORD_HASH && !ADMIN_PASSWORD_HASH.startsWith("scrypt$")) {
    console.warn("ADMIN_PASSWORD_HASH ignorado: formato invalido. Debe iniciar con 'scrypt$'.");
  }

  return safeCompare(password, ADMIN_PASSWORD);
}

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  const parsed = {};

  for (const chunk of raw.split(";")) {
    const [key, ...rest] = chunk.trim().split("=");
    if (!key) continue;
    parsed[key] = decodeURIComponent(rest.join("=") || "");
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
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + ADMIN_SESSION_TTL_HOURS * 60 * 60 * 1000;
  ADMIN_SESSIONS.set(token, { username: ADMIN_USERNAME, expiresAt });
  return { token, expiresAt };
}

function getAdminSession(req) {
  clearExpiredAdminSessions();
  const cookies = parseCookies(req);
  const token = cookies[ADMIN_SESSION_COOKIE];
  if (!token) return null;

  const session = ADMIN_SESSIONS.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    ADMIN_SESSIONS.delete(token);
    return null;
  }

  return { token, ...session };
}

function shouldUseSecureCookie(req) {
  if (ADMIN_COOKIE_SECURE === "true") return true;
  if (ADMIN_COOKIE_SECURE === "false") return false;

  const protoHeader = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;
  return req.secure || proto === "https";
}

function setAdminCookie(req, res, token) {
  res.cookie(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(req),
    path: "/",
    maxAge: ADMIN_SESSION_TTL_HOURS * 60 * 60 * 1000,
  });
}

function clearAdminCookie(req, res) {
  res.clearCookie(ADMIN_SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(req),
    path: "/",
  });
}

function requireAdmin(req, res, next) {
  const session = getAdminSession(req);
  if (!session) {
    clearAdminCookie(req, res);
    return res.status(401).json({ ok: false, reason: "admin_auth_required" });
  }

  req.adminSession = session;
  next();
}

app.post("/api/admin/login", (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  const validUser = safeCompare(username, ADMIN_USERNAME);
  const validPass = verifyAdminPassword(password);

  if (!validUser || !validPass) {
    return res.status(401).json({ ok: false, reason: "invalid_credentials" });
  }

  const session = createAdminSession();
  setAdminCookie(req, res, session.token);

  return res.json({
    ok: true,
    username: ADMIN_USERNAME,
    expiresAt: new Date(session.expiresAt).toISOString(),
  });
});

app.get("/api/admin/session", (req, res) => {
  const session = getAdminSession(req);
  if (!session) {
    clearAdminCookie(req, res);
    return res.json({ ok: true, authenticated: false });
  }

  return res.json({
    ok: true,
    authenticated: true,
    username: session.username,
    expiresAt: new Date(session.expiresAt).toISOString(),
  });
});

app.post("/api/admin/logout", (req, res) => {
  const session = getAdminSession(req);
  if (session?.token) {
    ADMIN_SESSIONS.delete(session.token);
  }

  clearAdminCookie(req, res);
  return res.json({ ok: true });
});

app.post("/api/one-time-links/create", requireAdmin, async (req, res) => {
  try {
    const token = makeToken();
    const nowIso = new Date().toISOString();
    const record = await createLinkRecord(token, nowIso);

    return res.json({
      ok: true,
      token,
      createdAt: record?.createdAt || nowIso,
      expiresAt: record?.expiresAt || calcExpiresAt(nowIso),
      status: "active",
      url: `${resolveBaseUrl(req)}/?token=${encodeURIComponent(token)}`,
      storage: USE_SUPABASE ? "supabase" : "file",
      ttlHours: LINK_TTL_HOURS,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, reason: "create_failed", detail: String(error) });
  }
});

app.get("/api/one-time-links/:token/status", async (req, res) => {
  try {
    const token = req.params.token;
    const record = await getLinkRecord(token);

    if (!record) {
      return res.status(404).json({ ok: false, reason: "not_found" });
    }

    return res.json({
      ok: true,
      status: effectiveStatus(record),
      createdAt: record.createdAt,
      expiresAt: record.expiresAt || calcExpiresAt(record.createdAt),
      usedAt: record.usedAt || null,
      resultText: record.resultText || null,
      participantName: record.participantName || null,
      storage: USE_SUPABASE ? "supabase" : "file",
      ttlHours: LINK_TTL_HOURS,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, reason: "status_failed", detail: String(error) });
  }
});

app.get("/api/one-time-links", requireAdmin, async (req, res) => {
  try {
    const rawLimit = Number(req.query.limit || 20);
    const limit = Math.max(1, Math.min(rawLimit, 100));
    const links = await listLinkRecords(limit);

    return res.json({
      ok: true,
      storage: USE_SUPABASE ? "supabase" : "file",
      ttlHours: LINK_TTL_HOURS,
      items: links.map((item) => ({
        token: item.token,
        status: effectiveStatus(item),
        createdAt: item.createdAt,
        expiresAt: item.expiresAt || calcExpiresAt(item.createdAt),
        usedAt: item.usedAt || null,
        resultText: item.resultText || "",
        participantName: item.participantName || "",
      })),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, reason: "list_failed", detail: String(error) });
  }
});

app.post("/api/one-time-links/:token/consume", async (req, res) => {
  try {
    const token = req.params.token;
    const resultText = typeof req.body?.resultText === "string" ? req.body.resultText : "";
    const participantName = typeof req.body?.participantName === "string" ? req.body.participantName : "";

    const result = await consumeLinkRecord(token, resultText, participantName);

    if (!result.ok && result.reason === "not_found") {
      return res.status(404).json({ ok: false, reason: "not_found" });
    }

    if (!result.ok && result.reason === "already_used") {
      return res.status(409).json({
        ok: false,
        reason: "already_used",
        usedAt: result.usedAt || null,
      });
    }

    if (!result.ok && result.reason === "expired") {
      return res.status(410).json({
        ok: false,
        reason: "expired",
        expiresAt: result.expiresAt || null,
      });
    }

    return res.json({
      ok: true,
      status: "used",
      usedAt: result.record.usedAt,
      storage: USE_SUPABASE ? "supabase" : "file",
    });
  } catch (error) {
    return res.status(500).json({ ok: false, reason: "consume_failed", detail: String(error) });
  }
});

app.post("/api/spin-history", async (req, res) => {
  try {
    const resultText = typeof req.body?.resultText === "string" ? req.body.resultText : "";
    const isLosing = Boolean(req.body?.isLosing);
    const linkToken = typeof req.body?.linkToken === "string" ? req.body.linkToken : "";
    const wheelOptionId = typeof req.body?.wheelOptionId === "string" ? req.body.wheelOptionId : "";
    const spunAt = typeof req.body?.spunAt === "string" ? req.body.spunAt : new Date().toISOString();

    const record = await recordSpinHistory({
      resultText,
      isLosing,
      linkToken,
      wheelOptionId,
      spunAt,
    });

    return res.json({ ok: true, storage: USE_SUPABASE ? "supabase" : "file", record });
  } catch (error) {
    return res.status(500).json({ ok: false, reason: "spin_history_failed", detail: String(error) });
  }
});

app.get("/api/spin-history", requireAdmin, async (req, res) => {
  try {
    const rawLimit = Number(req.query.limit || 20);
    const limit = Math.max(1, Math.min(rawLimit, 100));
    const items = await listSpinHistory(limit);

    return res.json({ ok: true, storage: USE_SUPABASE ? "supabase" : "file", items });
  } catch (error) {
    return res.status(500).json({ ok: false, reason: "spin_history_list_failed", detail: String(error) });
  }
});

app.use(express.static(DIST_DIR));

app.get("*", async (_req, res) => {
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`One-time links storage: ${USE_SUPABASE ? "Supabase" : "Local file"}`);
    console.log(`One-time links TTL (hours): ${LINK_TTL_HOURS}`);
  });
}

export default app;

function typeCheck() {
  // This is a runtime no-op. Keeps file straightforward in plain JS.
}
