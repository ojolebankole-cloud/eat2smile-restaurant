import {
  bodyJson,
  fail,
  json,
  passwordHash,
  sameOrigin,
  id,
  type PagesContext
} from '../../../_shared'

export const onRequestPost = async ({ request, env }: PagesContext) => {
  let stage = 'starting'

  try {
    stage = 'origin verification'
    if (!sameOrigin(request, env)) {
      return fail('Request origin rejected.', 403)
    }

    stage = 'bootstrap key verification'
    const key = request.headers.get('x-admin-bootstrap-key')
    if (!env.ADMIN_BOOTSTRAP_KEY || !key || key !== env.ADMIN_BOOTSTRAP_KEY) {
      return fail('Admin setup permission denied.', 403)
    }

    stage = 'reading request body'
    const b = await bodyJson<{ email: string; password: string }>(request)
    const email = String(b?.email || '').trim().toLowerCase()
    const password = String(b?.password || '')

    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 14 || password.length > 128) {
      return fail('Provide a valid email and an admin password of at least 14 characters.')
    }

    stage = 'checking existing administrators'
    const existing = await env.DB.prepare('SELECT id FROM admin_users LIMIT 1').first()

    if (existing) {
      return fail('Admin setup has already been completed.', 409)
    }

    stage = 'hashing administrator password'
    const hashedPassword = await passwordHash(password)

    stage = 'creating administrator'
    await env.DB.prepare(
      'INSERT INTO admin_users(id,email,password_hash,role) VALUES(?,?,?,?)'
    ).bind(id(), email, hashedPassword, 'admin').run()

    return json({ ok: true, email, role: 'admin' }, 201)

  } catch (error) {
    console.error('Eat2Smile bootstrap failure:', stage, error)

    return json({
      ok: false,
      error: 'Administrator setup failed',
      stage,
      detail: error instanceof Error ? error.message : String(error)
    }, 500)
  }
}
