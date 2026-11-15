import { json,type PagesContext } from '../_shared'
export const onRequestGet=async({env}:PagesContext)=>{const result=await env.DB.prepare('SELECT id,name,category,description,price_ngn AS price,image_url AS image,tag,is_available AS available FROM menu_items WHERE is_available=1 ORDER BY sort_order,name').all();return json({items:result.results})}
