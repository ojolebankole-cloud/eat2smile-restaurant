import { bodyJson, cookie, digest, fail, json, limited, sameOrigin, randomToken, verifyPassword, type PagesContext } from '../../../_shared'
export const onRequestPost=async({request,env}:PagesContext)=>{
 if(!sameOrigin(request,env))return fail('Request origin rejected.',403)
 const ip=request.headers.get('cf-connecting-ip')||'unknown';if(!await limited(env,`admin-login:${ip}`,6))return fail('Too many admin sign-in attempts. Try again later.',429)
 const b=await bodyJson<{email:string;password:string}>(request);const email=String(b?.email||'').trim().toLowerCase(),password=String(b?.password||'')
 const admin=await env.DB.prepare('SELECT id,email,password_hash,role FROM admin_users WHERE email=? AND is_active=1').bind(email).first<{id:string;email:string;password_hash:string;role:string}>()
 if(!admin||!await verifyPassword(password,admin.password_hash))return fail('Email or password is incorrect.',401)
 const token=randomToken(),days=Math.min(30,Math.max(1,Number(env.ADMIN_SESSION_DAYS||7)));await env.DB.prepare("INSERT INTO admin_sessions(id_hash,admin_id,expires_at) VALUES(?,?,datetime('now',?))").bind(await digest(token),admin.id,`+${days} days`).run()
 return json({admin:{id:admin.id,email:admin.email,role:admin.role}},200,{'set-cookie':cookie(token,days*86400).replace('__Host-es_session','__Host-es_admin')})
}
