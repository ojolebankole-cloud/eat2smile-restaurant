import { fail } from '../../_shared'
export const onRequestPost=async()=>fail('The legacy customer-linked staff bootstrap is retired. Use POST /api/admin/auth/bootstrap with the ADMIN_BOOTSTRAP_KEY secret.',410)
