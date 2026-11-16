import { bodyJson,digest,fail,id,json,limited,sameOrigin,type PagesContext } from '../../../_shared'

export const onRequestPost=async({request,env}:PagesContext)=>{
 if(!sameOrigin(request,env))return fail('Request origin rejected.',403)
 if(!env.FLW_SECRET_KEY)return fail('Online payment is temporarily unavailable. Please choose WhatsApp payment or contact the restaurant.',503)
 const ip=request.headers.get('cf-connecting-ip')||'unknown'
 if(!await limited(env,`flw-init:${ip}`,12))return fail('Too many payment attempts. Please wait and try again.',429)
 const b=await bodyJson<{orderId:string;accessToken:string}>(request)
 if(!b||typeof b.orderId!=='string'||!/^[-a-f0-9]{20,40}$/i.test(b.orderId)||typeof b.accessToken!=='string')return fail('Invalid payment request.')
 const order=await env.DB.prepare(`SELECT id,order_reference AS reference,status,customer_name AS name,customer_phone AS phone,customer_email AS email,total_ngn AS total,payment_method AS paymentMethod,payment_status AS paymentStatus FROM orders WHERE id=? AND guest_access_hash=?`).bind(b.orderId,await digest(b.accessToken)).first<any>()
 if(!order)return fail('Order not found or order access key is invalid.',404)
 if(order.paymentMethod!=='Online')return fail('This order was not created for online payment.',409)
 if(order.status==='Cancelled')return fail('This order has been cancelled. Contact the restaurant for assistance.',409)
 if(order.paymentStatus==='Paid')return fail('This order is already marked as paid.',409)
 if(!order.email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.email))return fail('A valid customer email is required for Flutterwave checkout.')
 const previous=await env.DB.prepare(`SELECT tx_ref AS txRef,checkout_url AS checkoutUrl,status FROM payment_transactions WHERE order_id=? AND provider='flutterwave' AND status='Pending' AND checkout_url IS NOT NULL AND created_at>=datetime('now','-25 minutes') ORDER BY created_at DESC LIMIT 1`).bind(order.id).first<any>()
 if(previous?.checkoutUrl)return json({checkoutUrl:previous.checkoutUrl,txRef:previous.txRef,amount:order.total})
 const txRef=`ES-${order.reference}-${crypto.randomUUID().replace(/-/g,'').slice(0,12).toUpperCase()}`
 const transactionId=id()
 await env.DB.prepare(`INSERT INTO payment_transactions(id,order_id,provider,tx_ref,amount_ngn,currency,status) VALUES(?,?,'flutterwave',?,?, 'NGN','Pending')`).bind(transactionId,order.id,txRef,order.total).run()
 const origin=env.APP_ORIGIN||new URL(request.url).origin
 try{
  const response=await fetch('https://api.flutterwave.com/v3/payments',{method:'POST',headers:{Authorization:`Bearer ${env.FLW_SECRET_KEY}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({tx_ref:txRef,amount:order.total,currency:'NGN',redirect_url:`${origin}/order?payment_callback=1`,customer:{email:order.email,name:order.name,phonenumber:order.phone},customizations:{title:'Eat2Smile Order Payment',description:`Payment for order ${order.reference}`},configuration:{session_duration:30,max_retry_attempt:3},meta:{order_reference:order.reference,order_id:order.id}})})
  const payload=await response.json().catch(()=>null) as any
  const checkoutUrl=payload?.data?.link
  if(!response.ok||payload?.status!=='success'||typeof checkoutUrl!=='string'||!checkoutUrl.startsWith('https://checkout.flutterwave.com/'))throw new Error(String(payload?.message||'Flutterwave could not create a checkout session.'))
  await env.DB.prepare(`UPDATE payment_transactions SET checkout_url=?,updated_at=? WHERE id=?`).bind(checkoutUrl,new Date().toISOString(),transactionId).run()
  return json({checkoutUrl,txRef,amount:order.total})
 }catch(error){
  const reason=error instanceof Error?error.message:'Unable to start Flutterwave checkout.'
  await env.DB.prepare(`UPDATE payment_transactions SET status='Failed',failure_reason=?,updated_at=? WHERE id=?`).bind(reason.slice(0,300),new Date().toISOString(),transactionId).run()
  return fail('We could not start the online payment. Your order is saved and unpaid. You can retry or contact Eat2Smile.',502)
 }
}
