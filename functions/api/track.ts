import { bodyJson,fail,json,limited,sameOrigin,type PagesContext } from '../_shared'
export const onRequestPost=async({request,env}:PagesContext)=>{
 if(!sameOrigin(request,env))return fail('Request origin rejected.',403)
 const ip=request.headers.get('cf-connecting-ip')||'unknown';if(!await limited(env,`track:${ip}`,8))return fail('Too many tracking attempts. Try again later.',429)
 const b=await bodyJson<{reference:string;phone:string}>(request);if(!b)return fail('Invalid request.')
 const reference=String(b.reference||'').trim().toUpperCase(),phone=String(b.phone||'').replace(/\D/g,'')
 if(!/^ES-[0-9]{6}-[A-F0-9]{16}$/.test(reference)||phone.length<10||phone.length>15)return fail('Enter the order reference and the full phone number used at checkout.')
 const order=await env.DB.prepare(`SELECT id,order_reference AS reference,status,order_type AS orderType,customer_name AS customerName,customer_phone AS phone,subtotal_ngn AS subtotal,delivery_fee_ngn AS deliveryFee,total_ngn AS total,created_at AS createdAt FROM orders WHERE order_reference=? AND substr(replace(replace(replace(replace(customer_phone,'+',''),' ',''),'-',''),'(',''),-10)=?`).bind(reference,phone.slice(-10)).first()
 if(!order)return fail('We could not find that order. Check the reference and full phone number.',404)
 const events=await env.DB.prepare('SELECT status,note,created_at AS createdAt FROM order_status_events WHERE order_id=(SELECT id FROM orders WHERE order_reference=?) ORDER BY created_at').bind(reference).all()
 const items=await env.DB.prepare('SELECT item_name AS name,quantity,unit_price_ngn AS unitPrice,line_total_ngn AS lineTotal FROM order_items WHERE order_id=(SELECT id FROM orders WHERE order_reference=?)').bind(reference).all()
 return json({order,events:events.results,items:items.results})
}
