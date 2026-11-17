export interface Env {
  DB: D1Database;
  APP_ORIGIN?: string;
  SESSION_DAYS?: string;
  MAX_UPLOAD_BYTES?: string;
  ADMIN_BOOTSTRAP_KEY?: string;
  ADMIN_SESSION_DAYS?: string;
  IMAGEKIT_PRIVATE_KEY?: string;
  IMAGEKIT_PUBLIC_KEY?: string;
  IMAGEKIT_URL_ENDPOINT?: string;
  FLW_SECRET_KEY?: string;
  FLW_SECRET_HASH?: string;
}

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta?: unknown;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<unknown>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
}

export interface PagesContext {
  request: Request;
  env: Env;
  params: Record<string, string>;
  waitUntil(promise: Promise<unknown>): void;
}

export type Handler = (context: PagesContext) => Promise<Response>;

export const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...Object.fromEntries(new Headers(headers))
    }
  });

export const fail = (message: string, status = 400) =>
  json({ error: message }, status);

export const id = () => crypto.randomUUID();

export const randomToken = (bytes = 32) => {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/,'');
};

export const digest = async (value: string) => {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );
  return [...new Uint8Array(hash)]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
};

export const passwordHash = async (
  password: string,
  salt = randomToken(16)
) => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    256
  );

  return `pbkdf2$100000$${salt}$${btoa(
    String.fromCharCode(...new Uint8Array(bits))
  )}`;
};

export const verifyPassword = async (
  password: string,
  stored: string
) => {
  const [kind, rounds, salt, expected] = stored.split('$');

  if (kind !== 'pbkdf2' || !rounds || !salt || !expected) {
    return false;
  }

  if (Number(rounds) > 100000) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(salt),
      iterations: Number(rounds),
      hash: 'SHA-256'
    },
    key,
    256
  );

  const actual = btoa(
    String.fromCharCode(...new Uint8Array(bits))
  );

  if (actual.length !== expected.length) {
    return false;
  }

  let difference = 0;

  for (let i = 0; i < actual.length; i++) {
    difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  }

  return difference === 0;
};

export const cookie = (token: string, maxAge: number) =>
  `__Host-es_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export const clearCookie =
  '__Host-es_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';

export const getCookie = (request: Request, name: string) =>
  request.headers.get('cookie')
    ?.split(';')
    .map(v => v.trim())
    .find(v => v.startsWith(`${name}=`))
    ?.slice(name.length + 1);

export async function currentCustomer(request: Request, env: Env) {
  const token = getCookie(request, '__Host-es_session');
  if (!token) return null;

  const hash = await digest(token);

  return env.DB.prepare(`
    SELECT c.id,c.email,c.full_name,c.phone
    FROM sessions s
    JOIN customers c ON c.id=s.customer_id
    WHERE s.id_hash=?
    AND julianday(s.expires_at) > julianday('now')
    AND c.is_active=1
  `).bind(hash).first<{
    id: string;
    email: string;
    full_name: string;
    phone: string;
  }>();
}

export async function requireCustomer(request: Request, env: Env) {
  return currentCustomer(request, env);
}

export function sameOrigin(request: Request, env: Env) {
  const origin = request.headers.get('origin');

  if (!origin) {
    return request.method === 'GET' || request.method === 'HEAD';
  }

  const requestUrl = new URL(request.url);

  const expected =
    requestUrl.hostname === 'localhost' ||
    requestUrl.hostname === '127.0.0.1'
      ? requestUrl.origin
      : (env.APP_ORIGIN || requestUrl.origin);

  return origin === expected;
}

export async function bodyJson<T = Record<string, unknown>>(
  request: Request
): Promise<T | null> {
  try {
    const raw = await request.text();
    if (raw.length > 32768) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    email.length <= 254;
}

export function normalizePhone(phone: string) {
  return phone.replace(/[\s().-]/g, '');
}

export async function limited(
  env: Env,
  key: string,
  max = 8
) {
  const now = new Date().toISOString();

  const row = await env.DB.prepare(
    'SELECT attempts,window_started FROM login_attempts WHERE key=?'
  ).bind(key).first<{
    attempts: number;
    window_started: string;
  }>();

  if (
    !row ||
    Date.now() - Date.parse(row.window_started) > 15 * 60 * 1000
  ) {
    await env.DB.prepare(`
      INSERT INTO login_attempts(key,attempts,window_started)
      VALUES(?,1,?)
      ON CONFLICT(key) DO UPDATE SET
      attempts=1,window_started=excluded.window_started
    `).bind(key, now).run();

    return true;
  }

  if (row.attempts >= max) return false;

  await env.DB.prepare(
    'UPDATE login_attempts SET attempts=attempts+1 WHERE key=?'
  ).bind(key).run();

  return true;
}

export const safeCustomer = (
  c: {
    id: string;
    email: string;
    full_name: string;
    phone: string;
  }
) => ({
  id: c.id,
  email: c.email,
  name: c.full_name,
  phone: c.phone
});

export async function currentAdmin(request: Request, env: Env) {
  const token = getCookie(request, '__Host-es_admin');
  if (!token) return null;

  const hash = await digest(token);

  return env.DB.prepare(`
    SELECT a.id,a.email,a.role
    FROM admin_sessions s
    JOIN admin_users a ON a.id=s.admin_id
    WHERE s.id_hash=?
    AND julianday(s.expires_at)>julianday('now')
    AND a.is_active=1
  `).bind(hash).first<{
    id: string;
    email: string;
    role: string;
  }>();
}

export const adminCookie = (token: string, maxAge: number) =>
  `__Host-es_admin=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

export const clearAdminCookie =
  '__Host-es_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';

export async function auditAdmin(
  request: Request,
  env: Env,
  actor: { id: string; email: string },
  action: string,
  entityType: string,
  entityId: string | null = null,
  details: Record<string, unknown> = {}
) {
  const ip = request.headers.get('cf-connecting-ip') || '';
  const ipHash = ip ? await digest(ip) : null;

  await env.DB.prepare(`
    INSERT INTO admin_activity_logs(
      id,admin_id,admin_email,action,entity_type,
      entity_id,details_json,ip_hash
    )
    VALUES(?,?,?,?,?,?,?,?)
  `).bind(
    id(),
    actor.id,
    actor.email,
    action,
    entityType,
    entityId,
    JSON.stringify(details).slice(0, 4000),
    ipHash
  ).run();
 }
