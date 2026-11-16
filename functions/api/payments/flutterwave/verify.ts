import { bodyJson,digest,fail,json,limited,sameOrigin,type PagesContext } from '../../../_shared'
import { settleFlutterwavePayment } from './_verify'

export const onRequestPost=async({request,env}:PagesContext)=>{
 if(!sameOrigin(request,env))return fail('Request origin rejected.',403)
 const ip=request.headers.get('cf-connecting-ip')||'unknown'
 if(!await limited(env,`flw-verify:${ip}`,20))return fail('Too many verification attempts. Please wait and try again.',429)
 const b=await bodyJson<{txRef:string;transactionId:string;accessToken:string}>(request)
 if(!b||typeof b.txRef!=='string'||b.txRef.length>180||!/^\d{1,30}$/.test(String(b.transactionId))||typeof b.accessToken!=='string')return fail('Invalid payment verification request.')
 const owned=await env.DB.prepare(`SELECT id FROM orders WHERE guest_access_hash=? AND id=(SELECT order_id FROM payment_transactions WHERE tx_ref=? AND provider='flutterwave')`).bind(await digest(b.accessToken),b.txRef).first()
 if(!owned)return fail('Order access could not be verified.',403)
 try{return json({payment:await settleFlutterwavePayment(env,b.transactionId,b.txRef)})}
 catch(error){return fail(error instanceof Error?error.message:'Payment could not be verified.',409)}
}
