import { currentCustomer,digest,fail,json,type PagesContext } from '../../_shared'
export const onRequestGet=async({request,env,params}:PagesContext)=>{
 const customer=await currentCustomer(request,env)
 const bearer=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||''
 const accessHash=bearer?await digest(bearer):''
 let order=customer
  ? await env.DB.prepare(`SELECT id,order_reference AS reference,status,order_type AS orderType,customer_name AS customerName,customer_phone AS phone,delivery_address AS address,delivery_instructions AS instructions,customer_email AS email,payment_method AS paymentMethod,payment_status AS paymentStatus,subtotal_ngn AS subtotal,delivery_fee_ngn AS deliveryFee,total_ngn AS total,created_at AS createdAt,updated_at AS updatedAt FROM orders WHERE id=? AND customer_id=?`).bind(params.id,customer.id).first<any>()
  : null
 if(!order&&accessHash)order=await env.DB.prepare(`SELECT id,order_reference AS reference,status,order_type AS orderType,customer_name AS customerName,customer_phone AS phone,delivery_address AS address,delivery_instructions AS instructions,customer_email AS email,payment_method AS paymentMethod,payment_status AS paymentStatus,subtotal_ngn AS subtotal,delivery_fee_ngn AS deliveryFee,total_ngn AS total,created_at AS createdAt,updated_at AS updatedAt FROM orders WHERE id=? AND guest_access_hash=?`).bind(params.id,accessHash).first<any>()
 if(!order)return fail('Order not found or this order access key is invalid.',404)
 const items=await env.DB.prepare('SELECT menu_item_id AS menuItemId,item_name AS name,unit_price_ngn AS unitPrice,quantity,line_total_ngn AS lineTotal FROM order_items WHERE order_id=?').bind(params.id).all()
 const events=await env.DB.prepare('SELECT status,note,created_at AS createdAt FROM order_status_events WHERE order_id=? ORDER BY created_at').bind(params.id).all()
 return json({order,items:items.results,events:events.results})
}
