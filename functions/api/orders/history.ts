import { bodyJson,currentCustomer,digest,fail,json,sameOrigin,type PagesContext } from '../../_shared'
export const onRequestPost=async({request,env}:PagesContext)=>{
 if(!sameOrigin(request,env))return fail('Request origin rejected.',403)
 const b=await bodyJson<{tokens?:string[]}>(request);const customer=await currentCustomer(request,env)
 const tokens=Array.isArray(b?.tokens)?b.tokens.slice(0,100).filter(t=>typeof t==='string'&&t.length>=30&&t.length<=100):[]
 const hashes=await Promise.all(tokens.map(digest));let guestRows:Record<string,unknown>[]=[]
 if(hashes.length){const marks=hashes.map(()=>'?').join(',');guestRows=(await env.DB.prepare(`SELECT id,order_reference AS reference,status,order_type AS orderType,subtotal_ngn AS subtotal,delivery_fee_ngn AS deliveryFee,total_ngn AS total,created_at AS createdAt FROM orders WHERE guest_access_hash IN (${marks})`).bind(...hashes).all()).results}
 let legacyRows:Record<string,unknown>[]=[]
 if(customer)legacyRows=(await env.DB.prepare(`SELECT id,order_reference AS reference,status,order_type AS orderType,subtotal_ngn AS subtotal,delivery_fee_ngn AS deliveryFee,total_ngn AS total,created_at AS createdAt FROM orders WHERE customer_id=? ORDER BY created_at DESC LIMIT 100`).bind(customer.id).all()).results
 const combined=[...guestRows,...legacyRows].filter((row,index,array)=>array.findIndex(other=>other.id===row.id)===index).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,100)
 return json({orders:combined})
}
