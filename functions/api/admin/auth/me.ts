import { currentAdmin,json,type PagesContext } from '../../../_shared'
export const onRequestGet=async({request,env}:PagesContext)=>{const admin=await currentAdmin(request,env);return json({admin:admin||null})}
