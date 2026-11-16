import { digest,fail,json,limited,sameOrigin,type PagesContext } from '../../_shared'

const EVENT_TYPES = new Set(['page_view','product_view','add_to_cart','checkout_started','search','category_view','order_submitted'])
const safeText=(value:unknown,max:number)=>String(value??'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,max)

// Privacy-minimised analytics beacon. Never accept/store names, phone numbers, email, addresses or raw IPs.
export const onRequestPost=async({request,env}:PagesContext)=>{
 if(!sameOrigin(request,env))return fail('Request origin rejected.',403)
 const ip=request.headers.get('cf-connecting-ip')||'unknown';if(!await limited(env,`analytics:${await digest(ip)}`,600))return fail('Analytics rate limit reached.',429)
 let body:any={};try{body=await request.json()}catch{return fail('Invalid analytics event.')}
 const visitor=safeText(body.visitorId,64),session=safeText(body.sessionId,64),path=safeText(body.path,180)
 const eventType=safeText(body.eventType||'page_view',32)
 if(!/^[a-f0-9-]{32,64}$/i.test(visitor)||!/^[a-f0-9-]{32,64}$/i.test(session)||!/^\/(?!api\/|admin|orders)([a-z0-9\-/]*)?$/i.test(path)||!EVENT_TYPES.has(eventType))return fail('Invalid analytics event.')
 let data:Record<string,string|number>={}
 if(body.data&&typeof body.data==='object'&&!Array.isArray(body.data)){
  for(const key of ['productId','productName','category','searchLength','itemCount','cartValue']){
   const value=body.data[key]
   if(typeof value==='number'&&Number.isFinite(value))data[key]=Math.max(0,Math.min(value,100000000))
   else if(typeof value==='string')data[key]=safeText(value, key==='productName'?100:80)
  }
 }
 const referrer=safeText(body.referrer,500);let host='';try{host=referrer?new URL(referrer).hostname.slice(0,120):''}catch{}
 const ua=request.headers.get('user-agent')||''
 const device=/mobile|android|iphone/i.test(ua)?'mobile':/ipad|tablet/i.test(ua)?'tablet':'desktop'
 const country=(request.headers.get('cf-ipcountry')||'').slice(0,2).toUpperCase()
 await env.DB.prepare('INSERT INTO analytics_events(id,visitor_id,event_type,page_path,referrer_host,device_type,country_code,session_id,event_data) VALUES(?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),visitor,eventType,path,host,device,country,session,JSON.stringify(data)).run()
 return json({ok:true},202)
}
