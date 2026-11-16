import { bodyJson, fail, json, passwordHash, sameOrigin, id, type PagesContext } from '../../../_shared'
export const onRequestPost=async({request,env}:PagesContext)=>{
 if(!sameOrigin(request,env))return fail('Request origin rejected.',403)
 const key=request.headers.get('x-admin-bootstrap-key')
 if(!env.ADMIN_BOOTSTRAP_KEY||!key||key!==env.ADMIN_BOOTSTRAP_KEY)return fail('Admin setup permission denied.',403)
 const b=await bodyJson<{email:string;password:string}>(request)
 const email=String(b?.email||'').trim().toLowerCase(),password=String(b?.password||'')
 if(!/^\S+@\S+\.\S+$/.test(email)||password.length<14||password.length>128)return fail('Provide a valid email and an admin password of at least 14 characters.')
 const existing=await env.DB.prepare('SELECT id FROM admin_users LIMIT 1').first()
 if(existing)return fail('Admin setup has already been completed.',409)
 await env.DB.prepare('INSERT INTO admin_users(id,email,password_hash,role) VALUES(?,?,?,?)').bind(id(),email,await passwordHash(password),'admin').run()
 return json({ok:true,email,role:'admin'},201)
}
