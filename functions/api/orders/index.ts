import { bodyJson, currentCustomer, digest, fail, id, json, limited, randomToken, sameOrigin, type PagesContext } from '../../_shared'
type CartLine={id:string;quantity:number}
type PaymentMethod='Online'|'WhatsApp'
const reference=()=>`ES-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${crypto.getRandomValues(new Uint8Array(8)).reduce((s,n)=>s+n.toString(16).padStart(2,'0'),'').toUpperCase()}`
const validKey=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
export const onRequestPost=async({request,env}:PagesContext)=>{
 if(!sameOrigin(request,env))return fail('Request origin rejected.',403)
 const ip=request.headers.get('cf-connecting-ip')||'unknown';if(!await limited(env,`guest-order:${ip}`,12))return fail('Too many order attempts. Please wait and try again.',429)
 const b=await bodyJson<{items:CartLine[];orderType:'Delivery'|'Pickup';name:string;phone:string;email?:string;paymentMethod?:PaymentMethod;couponCode?:string;referralCode?:string;address?:string;instructions?:string;idempotencyKey:string;accessToken:string}>(request)
 if(!b||!Array.isArray(b.items)||!b.items.length||b.items.length>30||!validKey(String(b.idempotencyKey||'')))return fail('Invalid order request. Check your cart and try again.')
 if(!['Delivery','Pickup'].includes(b.orderType))return fail('Choose delivery or pickup.')
 if(b.paymentMethod!==undefined&&!['Online','WhatsApp'].includes(b.paymentMethod))return fail('Choose a valid payment method.')
 const name=String(b.name||'').trim(),rawPhone=String(b.phone||'').trim(),digits=rawPhone.replace(/\D/g,'')
 if(name.length<2||name.length>100||digits.length<10||digits.length>15)return fail('Enter your full name and a valid active phone number.')
 const phone=digits
 const paymentMethod:PaymentMethod=b.paymentMethod==='Online'?'Online':'WhatsApp'
 const email=String(b.email||'').trim().toLowerCase()
 if(paymentMethod==='Online'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return fail('Enter a valid email address for your online payment.')
 if(email.length>254)return fail('Email address is too long.')
 const address=String(b.address||'').trim(),instructions=String(b.instructions||'').trim()
 if(b.orderType==='Delivery'&&(address.length<8||address.length>500))return fail('Enter a complete delivery address.')
 if(instructions.length>1000)return fail('Special instructions are too long.')
 const previous=await env.DB.prepare(`SELECT o.id,o.order_reference AS reference,o.status,o.order_type AS orderType,o.subtotal_ngn AS subtotal,o.delivery_fee_ngn AS deliveryFee,o.total_ngn AS total,o.created_at AS createdAt,o.guest_access_hash AS accessHash,o.payment_method AS paymentMethod,o.payment_status AS paymentStatus FROM guest_order_keys k JOIN orders o ON o.id=k.order_id WHERE k.idempotency_key=?`).bind(b.idempotencyKey).first<any>()
 if(previous){const supplied=String(b.accessToken||'');if(supplied&&await digest(supplied)===previous.accessHash)return json({order:{id:previous.id,reference:previous.reference,status:previous.status,orderType:previous.orderType,subtotal:previous.subtotal,deliveryFee:previous.deliveryFee,total:previous.total,createdAt:previous.createdAt,paymentMethod:previous.paymentMethod,paymentStatus:previous.paymentStatus},accessToken:supplied});return fail('This checkout attempt was already submitted, but its private access key does not match. Use order recovery with your order reference and full phone number.',409)}
 const quantities=new Map<string,number>()
 for(const line of b.items){if(!line||typeof line.id!=='string'||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>50)return fail('One or more cart quantities are invalid.');quantities.set(line.id,(quantities.get(line.id)||0)+line.quantity)}
 if([...quantities.values()].some(q=>q>50))return fail('Maximum quantity per menu item is 50.')
 const ids=[...quantities.keys()],marks=ids.map(()=>'?').join(',')
 const rows=(await env.DB.prepare(`SELECT id,name,CASE WHEN discount_price_ngn IS NOT NULL AND (special_starts_at IS NULL OR datetime(special_starts_at)<=datetime('now')) AND (special_ends_at IS NULL OR datetime(special_ends_at)>=datetime('now')) THEN discount_price_ngn ELSE price_ngn END AS price_ngn FROM menu_items WHERE is_available=1 AND id IN (${marks})`).bind(...ids).all<{id:string;name:string;price_ngn:number}>()).results
 if(rows.length!==ids.length)return fail('A menu item is unavailable or has changed. Refresh the menu and try again.',409)
 const rowMap=new Map(rows.map(r=>[r.id,r]));const lines=ids.map(itemId=>{const item=rowMap.get(itemId)!;const quantity=quantities.get(itemId)!;return{id:id(),menuId:item.id,name:item.name,price:item.price_ngn,quantity,total:item.price_ngn*quantity}})
 const subtotal=lines.reduce((sum,line)=>sum+line.total,0);if(!Number.isSafeInteger(subtotal)||subtotal>100000000)return fail('Order total is outside the allowed range.')
 let referral:any=null;const referralCode=String(b.referralCode||'').trim().toUpperCase();if(referralCode){if(!/^[A-Z0-9_-]{5,24}$/.test(referralCode))return fail('Referral code is invalid.');referral=await env.DB.prepare('SELECT id,phone_hash,referral_code FROM loyalty_accounts WHERE referral_code=? COLLATE NOCASE').bind(referralCode).first<any>();if(!referral)return fail('Referral code was not recognised.',404);if(referral.phone_hash===await digest(phone))return fail('You cannot use your own referral code.')}let coupon:any=null,discount=0;const couponCode=String(b.couponCode||'').trim().toUpperCase();if(couponCode){if(!/^[A-Z0-9_-]{3,32}$/.test(couponCode))return fail('Coupon code is invalid.');coupon=await env.DB.prepare(`SELECT * FROM coupons WHERE code=? COLLATE NOCASE AND active=1 AND (starts_at IS NULL OR datetime(starts_at)<=datetime('now')) AND (ends_at IS NULL OR datetime(ends_at)>=datetime('now'))`).bind(couponCode).first<any>();if(!coupon)return fail('This coupon is invalid or expired.',404);if(subtotal<coupon.min_order_ngn)return fail('Your order does not meet this coupon’s minimum spend.');if(coupon.usage_limit!==null&&coupon.usage_count>=coupon.usage_limit)return fail('This coupon has reached its usage limit.',409);const phoneHash=await digest(phone);const used=await env.DB.prepare('SELECT COUNT(*) AS count FROM coupon_redemptions WHERE coupon_id=? AND phone_hash=?').bind(coupon.id,phoneHash).first<any>();if(Number(used?.count||0)>=coupon.per_phone_limit)return fail('This coupon has already reached its limit for this phone number.',409);discount=coupon.discount_type==='percent'?Math.floor(subtotal*coupon.discount_value/100):coupon.discount_value;if(coupon.max_discount_ngn!==null)discount=Math.min(discount,coupon.max_discount_ngn);discount=Math.min(discount,subtotal)}const total=subtotal-discount
 const orderId=id(),orderRef=reference(),guestId=id(),accessToken=String(b.accessToken||'')
 if(!/^[A-Za-z0-9_-]{40,50}$/.test(accessToken))return fail('The private order access key is invalid. Refresh checkout and try again.')
 const accessHash=await digest(accessToken)
 // Keep the legacy customer_id FK and historical records intact. This synthetic row is not an account and cannot sign in.
 const guestEmail=`guest-${guestId}@orders.eat2smile.invalid`
 const statements=[
  env.DB.prepare('INSERT INTO customers(id,email,password_hash,full_name,phone) VALUES(?,?,?,?,?)').bind(guestId,guestEmail,`disabled$${randomToken(24)}`,name,phone),
  env.DB.prepare(`INSERT INTO orders(id,order_reference,customer_id,idempotency_key,guest_access_hash,order_type,customer_name,customer_phone,customer_email,delivery_address,delivery_instructions,subtotal_ngn,delivery_fee_ngn,total_ngn,payment_method,payment_status,coupon_code,discount_ngn,referral_code) VALUES(?,?,?,?,?,?,?,?,?,?,?, ?,0,?,?,?,?,?,?)`).bind(orderId,orderRef,guestId,b.idempotencyKey,accessHash,b.orderType,name,phone,email,b.orderType==='Delivery'?address:null,instructions,subtotal,total,paymentMethod,paymentMethod==='Online'?'Pending':'Unconfirmed',coupon?.code||null,discount,referral?.referral_code||null),
  ...lines.map(line=>env.DB.prepare('INSERT INTO order_items(id,order_id,menu_item_id,item_name,unit_price_ngn,quantity,line_total_ngn) VALUES(?,?,?,?,?,?,?)').bind(line.id,orderId,line.menuId,line.name,line.price,line.quantity,line.total)),
  env.DB.prepare('INSERT INTO order_status_events(id,order_id,status,note) VALUES(?,?,?,?)').bind(id(),orderId,'New',paymentMethod==='Online'?'Online payment selected; awaiting Flutterwave checkout':'WhatsApp direct payment selected; awaiting owner coordination'),
  env.DB.prepare('INSERT INTO guest_order_keys(idempotency_key,order_id) VALUES(?,?)').bind(b.idempotencyKey,orderId),
  ...(coupon?[env.DB.prepare('INSERT INTO coupon_redemptions(id,coupon_id,order_id,phone_hash,discount_ngn) VALUES(?,?,?,?,?)').bind(id(),coupon.id,orderId,await digest(phone),discount),env.DB.prepare('UPDATE coupons SET usage_count=usage_count+1 WHERE id=?').bind(coupon.id)]:[])
 ]
 try{await env.DB.batch(statements)}catch{const duplicate=await env.DB.prepare(`SELECT o.id,o.order_reference AS reference,o.status,o.order_type AS orderType,o.subtotal_ngn AS subtotal,o.delivery_fee_ngn AS deliveryFee,o.total_ngn AS total,o.created_at AS createdAt,o.guest_access_hash AS accessHash,o.payment_method AS paymentMethod,o.payment_status AS paymentStatus FROM guest_order_keys k JOIN orders o ON o.id=k.order_id WHERE k.idempotency_key=?`).bind(b.idempotencyKey).first<any>();if(duplicate&&duplicate.accessHash===accessHash)return json({order:{id:duplicate.id,reference:duplicate.reference,status:duplicate.status,orderType:duplicate.orderType,subtotal:duplicate.subtotal,deliveryFee:duplicate.deliveryFee,total:duplicate.total,createdAt:duplicate.createdAt,paymentMethod:duplicate.paymentMethod,paymentStatus:duplicate.paymentStatus},accessToken},200);return fail('We could not save your order. Nothing has been confirmed; please try again.',500)}
 return json({order:{id:orderId,reference:orderRef,status:'New',orderType:b.orderType,subtotal,discount,total,deliveryFee:0,paymentMethod,paymentStatus:paymentMethod==='Online'?'Pending':'Unconfirmed',createdAt:new Date().toISOString()},accessToken},201)
}
export const onRequestGet=async({request,env}:PagesContext)=>{
 const customer=await currentCustomer(request,env)
 if(customer){const rows=await env.DB.prepare(`SELECT id,order_reference AS reference,status,order_type AS orderType,subtotal_ngn AS subtotal,delivery_fee_ngn AS deliveryFee,total_ngn AS total,created_at AS createdAt FROM orders WHERE customer_id=? ORDER BY created_at DESC LIMIT 100`).bind(customer.id).all();return json({orders:rows.results})}
 const raw=new URL(request.url).searchParams.getAll('token');const tokens=raw.slice(0,100).filter(t=>t.length>=30&&t.length<=100)
 if(!tokens.length)return json({orders:[]})
 const hashes=await Promise.all(tokens.map(digest));const marks=hashes.map(()=>'?').join(',')
 const rows=await env.DB.prepare(`SELECT id,order_reference AS reference,status,order_type AS orderType,subtotal_ngn AS subtotal,delivery_fee_ngn AS deliveryFee,total_ngn AS total,created_at AS createdAt FROM orders WHERE guest_access_hash IN (${marks}) ORDER BY created_at DESC LIMIT 100`).bind(...hashes).all()
 return json({orders:rows.results})
}
