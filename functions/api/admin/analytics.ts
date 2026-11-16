import { currentAdmin,fail,json,type PagesContext } from '../../_shared'

const ranges:Record<string,{modifier:string;days:number}>={today:{modifier:"start of day",days:1},'7d':{modifier:'-7 days',days:7},'30d':{modifier:'-30 days',days:30},'90d':{modifier:'-90 days',days:90},'12m':{modifier:'-12 months',days:365}}

export const onRequestGet=async({request,env}:PagesContext)=>{
 const admin=await currentAdmin(request,env);if(!admin)return fail('Administrator sign-in required.',401)
 const allowed=await env.DB.prepare("SELECT role FROM admin_users WHERE email=? AND is_active=1 AND role IN ('admin','manager')").bind(admin.email).first()
 if(!allowed)return fail('Manager permission required.',403)
 const url=new URL(request.url),range=ranges[url.searchParams.get('range')||'30d']?url.searchParams.get('range')!:'30d'
 const start=range==='today'?"datetime('now','start of day')":`datetime('now','${ranges[range].modifier}')`
 const trendBucket=range==='12m'?"strftime('%Y-%m',created_at)":'date(created_at)'
 const summary=await env.DB.prepare(`SELECT
 COUNT(*) AS totalOrders,
 SUM(CASE WHEN date(created_at)=date('now') THEN 1 ELSE 0 END) AS todayOrders,
 SUM(CASE WHEN status IN ('New','Accepted','Cooking','Ready for Pickup','On Delivery') THEN 1 ELSE 0 END) AS pendingOrders,
 SUM(CASE WHEN status='Delivered' THEN 1 ELSE 0 END) AS completedOrders,
 SUM(CASE WHEN status='Cancelled' THEN 1 ELSE 0 END) AS cancelledOrders,
 COALESCE(SUM(CASE WHEN status='Delivered' THEN total_ngn ELSE 0 END),0) AS deliveredOrderValue,
 COALESCE(SUM(CASE WHEN status='Delivered' THEN total_ngn ELSE 0 END),0) AS totalRevenue,
 COALESCE(SUM(CASE WHEN status='Delivered' AND date(created_at)=date('now') THEN total_ngn ELSE 0 END),0) AS todayRevenue,
 (SELECT COALESCE(SUM(total_ngn),0) FROM orders w WHERE w.status='Delivered' AND w.payment_status='Paid' AND w.created_at>=datetime('now','-7 days')) AS weeklyRevenue,
 (SELECT COALESCE(SUM(total_ngn),0) FROM orders m WHERE m.status='Delivered' AND m.payment_status='Paid' AND m.created_at>=datetime('now','-30 days')) AS monthlyRevenue,
 COALESCE(SUM(CASE WHEN status='Delivered' AND payment_status='Paid' THEN total_ngn ELSE 0 END),0) AS confirmedRevenue,
 COALESCE(SUM(CASE WHEN status='Delivered' AND payment_status='Paid' AND date(created_at)=date('now') THEN total_ngn ELSE 0 END),0) AS todayConfirmedRevenue,
 COALESCE(AVG(CASE WHEN status='Delivered' AND payment_status='Paid' THEN total_ngn END),0) AS averagePaidOrderValue,
 SUM(CASE WHEN payment_status='Paid' THEN 1 ELSE 0 END) AS paidOrders,
 SUM(CASE WHEN payment_status IN ('Pending','Unconfirmed') THEN 1 ELSE 0 END) AS unpaidOrPendingOrders
 FROM orders WHERE created_at>=${start}`).first()
 const allTime=await env.DB.prepare(`SELECT COUNT(*) totalOrders,COALESCE(SUM(CASE WHEN status='Delivered' AND payment_status='Paid' THEN total_ngn ELSE 0 END),0) confirmedRevenue FROM orders`).first()
 const visitors=await env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN event_type='page_view' THEN visitor_id END) uniqueVisitors,SUM(CASE WHEN event_type='page_view' THEN 1 ELSE 0 END) pageViews,COUNT(DISTINCT CASE WHEN session_id<>'' THEN session_id END) sessions,
 COUNT(DISTINCT CASE WHEN created_at>=datetime('now','-5 minutes') THEN visitor_id END) activeVisitors,
 COUNT(DISTINCT CASE WHEN event_type='page_view' AND visitor_id IN (SELECT visitor_id FROM analytics_events older WHERE older.created_at<${start} AND older.event_type='page_view') THEN visitor_id END) returningVisitors
 FROM analytics_events WHERE created_at>=${start}`).first()
 const prior=await env.DB.prepare(`SELECT COUNT(DISTINCT visitor_id) previousVisitors FROM analytics_events WHERE created_at<${start}`).first()
 const popular=await env.DB.prepare(`SELECT item_name name,SUM(quantity) quantity,SUM(CASE WHEN o.payment_status='Paid' THEN line_total_ngn ELSE 0 END) revenue,COUNT(DISTINCT o.id) orders FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.status='Delivered' AND o.created_at>=${start} GROUP BY item_name ORDER BY quantity DESC LIMIT 10`).all()
 const recent=await env.DB.prepare(`SELECT id,order_reference reference,status,order_type orderType,customer_name customerName,customer_phone phone,total_ngn total,created_at createdAt,payment_method paymentMethod,payment_status paymentStatus FROM orders ORDER BY created_at DESC LIMIT 8`).all()
 const trend=await env.DB.prepare(`SELECT ${trendBucket} day,COUNT(*) orders,COALESCE(SUM(CASE WHEN status='Delivered' THEN total_ngn ELSE 0 END),0) deliveredValue,COALESCE(SUM(CASE WHEN status='Delivered' AND payment_status='Paid' THEN total_ngn ELSE 0 END),0) revenue FROM orders WHERE created_at>=${start} GROUP BY date(created_at) ORDER BY day`).all()
 const pages=await env.DB.prepare(`SELECT page_path page,COUNT(*) views,COUNT(DISTINCT visitor_id) visitors FROM analytics_events WHERE event_type='page_view' AND created_at>=${start} GROUP BY page_path ORDER BY views DESC LIMIT 10`).all()
 const sources=await env.DB.prepare(`SELECT CASE WHEN referrer_host='' THEN 'Direct / unknown' ELSE referrer_host END source,COUNT(*) visits,COUNT(DISTINCT visitor_id) visitors FROM analytics_events WHERE event_type='page_view' AND created_at>=${start} GROUP BY source ORDER BY visits DESC LIMIT 10`).all()
 const devices=await env.DB.prepare(`SELECT device_type device,COUNT(*) views,COUNT(DISTINCT visitor_id) visitors FROM analytics_events WHERE event_type='page_view' AND created_at>=${start} GROUP BY device_type ORDER BY views DESC`).all()
 const countries=await env.DB.prepare(`SELECT CASE WHEN country_code='' THEN 'Unknown' ELSE country_code END country,COUNT(DISTINCT visitor_id) visitors FROM analytics_events WHERE created_at>=${start} GROUP BY country_code ORDER BY visitors DESC LIMIT 10`).all()
 const payments=await env.DB.prepare(`SELECT COALESCE(payment_method,'Unspecified') method,COALESCE(payment_status,'Unconfirmed') status,COUNT(*) orders,COALESCE(SUM(CASE WHEN payment_status='Paid' THEN total_ngn ELSE 0 END),0) paidValue FROM orders WHERE created_at>=${start} GROUP BY payment_method,payment_status ORDER BY orders DESC`).all()
 const statuses=await env.DB.prepare(`SELECT status,COUNT(*) orders FROM orders WHERE created_at>=${start} GROUP BY status ORDER BY orders DESC`).all()
 const funnel=await env.DB.prepare(`SELECT event_type event,COUNT(*) events,COUNT(DISTINCT CASE WHEN session_id<>'' THEN session_id END) sessions FROM analytics_events WHERE created_at>=${start} AND event_type IN ('page_view','product_view','add_to_cart','checkout_started','order_submitted','search','category_view') GROUP BY event_type`).all()
 const productViews=await env.DB.prepare(`SELECT json_extract(event_data,'$.productName') name,COUNT(*) views,COUNT(DISTINCT visitor_id) visitors FROM analytics_events WHERE event_type='product_view' AND created_at>=${start} AND json_extract(event_data,'$.productName') IS NOT NULL GROUP BY name ORDER BY views DESC LIMIT 10`).all()
 const categoryViews=await env.DB.prepare(`SELECT json_extract(event_data,'$.category') category,COUNT(*) views FROM analytics_events WHERE event_type='category_view' AND created_at>=${start} AND json_extract(event_data,'$.category') IS NOT NULL GROUP BY category ORDER BY views DESC LIMIT 10`).all()
 return json({range,summary,allTime,visitors,previous:prior,popular:popular.results,recent:recent.results,trend:trend.results,pages:pages.results,sources:sources.results,devices:devices.results,countries:countries.results,payments:payments.results,statuses:statuses.results,funnel:funnel.results,productViews:productViews.results,categoryViews:categoryViews.results,generatedAt:new Date().toISOString()})
}
