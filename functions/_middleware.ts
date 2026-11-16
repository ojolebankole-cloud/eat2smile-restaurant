import type { PagesContext } from './_shared'
export const onRequest=async({request,next}:PagesContext&{next:()=>Promise<Response>})=>{
const pathname=new URL(request.url).pathname.replace(/\/+$/,'')||'/'
 if(['/admin','/admin.html'].includes(pathname)){
  return new Response('Not Found',{status:404,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}})
 }
 const response=await next(),headers=new Headers(response.headers)
 headers.set('x-content-type-options','nosniff')
 headers.set('referrer-policy','strict-origin-when-cross-origin')
 headers.set('x-frame-options','DENY')
 headers.set('permissions-policy','camera=(), microphone=(), geolocation=()')
 headers.set('cross-origin-opener-policy','same-origin')
 headers.set('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' mailto:; frame-ancestors 'none'")

 if(pathname.startsWith('/api/')){
  headers.set('cache-control','no-store')
  headers.set('x-robots-tag','noindex, nofollow, noarchive')
 }
 // Let crawlers read these HTML responses and discover their noindex directive.
 if(['/e2s-owner-portal-8m4q7x2n','/e2s-owner-portal-8m4q7x2n.html','/orders','/orders.html'].includes(pathname)){
  headers.set('x-robots-tag','noindex, nofollow, noarchive')
  headers.set('cache-control','no-store')
 }
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers})
}
