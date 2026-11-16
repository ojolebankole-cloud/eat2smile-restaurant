import { bodyJson,digest,fail,json,limited,randomToken,sameOrigin,type PagesContext } from '../../_shared'
export const onRequestPost=async({request,env}:PagesContext)=>{
 if(!sameOrigin(request,env))return fail('Request origin rejected.',403)
 const ip=request.headers.get('cf-connecting-ip')||'unknown';if(!await limited(env,`order-recovery:${ip}`,5))return fail('Too many recovery attempts. Try again later.',429)
 const b=await bodyJson<{reference:string;phone:string}>(request);if(!b)return fail('Invalid recovery request.')
 const reference=String(b.reference||'').trim().toUpperCase(),digits=String(b.phone||'').replace(/\D/g,'')
 if(!/^ES-[0-9]{6}-[A-F0-9]{16}$/.test(reference)||digits.length<10||digits.length>15)return fail('Enter the order reference and the full phone number used at checkout.')
 const order=await env.DB.prepare(`SELECT id,order_reference AS reference,status,order_type AS orderType,subtotal_ngn AS subtotal,delivery_fee_ngn AS deliveryFee,total_ngn AS total,created_at AS createdAt FROM orders WHERE order_reference=? AND substr(replace(replace(replace(replace(customer_phone,'+',''),' ',''),'-',''),'(',''),-10)=?`).bind(reference,digits.slice(-10)).first()
 if(!order)return fail('We could not verify that order. Check the reference and full phone number.',404)
 const token=randomToken(32),hash=await digest(token)
 await env.DB.prepare('UPDATE orders SET guest_access_hash=? WHERE order_reference=?').bind(hash,reference).run()
 return json({order,accessToken:token})
}
