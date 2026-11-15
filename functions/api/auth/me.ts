import { currentCustomer,json,safeCustomer,type PagesContext } from '../../_shared'
export const onRequestGet=async({request,env}:PagesContext)=>{const c=await currentCustomer(request,env);return json({customer:c?safeCustomer(c):null})}
