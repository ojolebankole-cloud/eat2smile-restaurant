import { bodyJson,currentAdmin,fail,json,passwordHash,sameOrigin,verifyPassword,type PagesContext } from '../../../_shared'
export const onRequestPost=async({request,env}:PagesContext)=>{
 if(!sameOrigin(request,env))return fail('Request origin rejected.',403)
 const actor=await currentAdmin(request,env);if(!actor)return fail('Administrator sign-in required.',401)
 const b=await bodyJson<{currentPassword:string;newPassword:string}>(request);const current=String(b?.currentPassword||''),next=String(b?.newPassword||'')
 if(next.length<14||next.length>128||!/[A-Z]/.test(next)||!/[a-z]/.test(next)||!/[0-9]/.test(next))return fail('New password must be 14–128 characters and include upper-case, lower-case and a number.')
 const row=await env.DB.prepare('SELECT password_hash FROM admin_users WHERE id=? AND is_active=1').bind(actor.id).first<{password_hash:string}>();if(!row||!await verifyPassword(current,row.password_hash))return fail('Current password is incorrect.',401)
 await env.DB.batch([env.DB.prepare("UPDATE admin_users SET password_hash=?,updated_at=datetime('now') WHERE id=?").bind(await passwordHash(next),actor.id),env.DB.prepare('DELETE FROM admin_sessions WHERE admin_id=?').bind(actor.id)])
 return json({ok:true,message:'Password changed. All admin sessions were revoked; sign in again.'},200,{'set-cookie':'__Host-es_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'})
}
