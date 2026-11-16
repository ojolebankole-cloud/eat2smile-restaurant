import { json,type PagesContext } from '../../../_shared'
import { settleFlutterwavePayment } from './_verify'

export const onRequestPost=async({request,env}:PagesContext)=>{
 const supplied=request.headers.get('verif-hash')||''
 if(!env.FLW_SECRET_HASH||!supplied||supplied!==env.FLW_SECRET_HASH)return new Response('Unauthorized',{status:401})
 const body=await request.json().catch(()=>null) as any
 const txId=String(body?.data?.id||'')
 const txRef=String(body?.data?.tx_ref||'')
 if(!/^\d{1,30}$/.test(txId)||!txRef)return new Response('Invalid event',{status:400})
 try{await settleFlutterwavePayment(env,txId,txRef);return json({received:true})}
 catch(error){
  // A failed/pending event is not a payment confirmation. Keep the order unpaid.
  const status=String(body?.data?.status||'').toLowerCase()
  if(status==='failed'||status==='cancelled'){const state=status==='cancelled'?'Cancelled':'Failed';await env.DB.batch([env.DB.prepare(`UPDATE payment_transactions SET status=?,failure_reason=?,updated_at=? WHERE tx_ref=? AND status='Pending'`).bind(state,String(body?.data?.processor_response||status).slice(0,300),new Date().toISOString(),txRef),env.DB.prepare(`UPDATE orders SET payment_status='Failed',updated_at=datetime('now') WHERE id=(SELECT order_id FROM payment_transactions WHERE tx_ref=?) AND payment_status='Pending'`).bind(txRef)]);return json({received:true,verified:false})}
  // Ask Flutterwave to retry successful events when our verification API is temporarily unavailable.
  if(status==='successful')return new Response('Payment verification temporarily unavailable',{status:500})
  return json({received:true,ignored:true})
 }
}
