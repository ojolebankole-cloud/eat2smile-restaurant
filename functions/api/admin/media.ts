import { currentCustomer, fail, json, sameOrigin, type PagesContext } from '../../_shared'

const MIME_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }
function hasValidSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mime === 'image/png') return bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)
  if (mime === 'image/webp') return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP'
  if (mime === 'image/avif') { const brand = String.fromCharCode(...bytes.slice(8,12)); return bytes.length >= 12 && (brand === 'avif' || brand === 'avis') }
  return false
}
function safeFileName(name: string, ext: string) {
  const base = name.replace(/\.[^.]+$/, '').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'menu-image'
  return `${base}-${crypto.randomUUID()}.${ext}`
}

export const onRequestPost = async ({ request, env }: PagesContext) => {
  if (!sameOrigin(request, env)) return fail('Request origin rejected.', 403)
  const customer = await currentCustomer(request, env)
  if (!customer) return fail('Sign in required.', 401)
  const staff = await env.DB.prepare("SELECT role FROM staff_users WHERE email=? AND role IN ('admin','manager') AND is_active=1").bind(customer.email).first<{role:string}>()
  if (!staff) return fail('Manager permission required.', 403)
  if (!env.IMAGEKIT_PRIVATE_KEY || !env.IMAGEKIT_PUBLIC_KEY || !env.IMAGEKIT_URL_ENDPOINT) return fail('Image storage is not configured. Contact the site administrator.', 503)

  const max = Math.min(10 * 1024 * 1024, Math.max(1024, Number(env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024)))
  const declared = Number(request.headers.get('content-length') || 0)
  if (declared > max + 65536) return fail('Upload is larger than the allowed limit.', 413)
  let form: FormData
  try { form = await request.formData() } catch { return fail('Upload form is invalid.', 400) }
  const file = form.get('file')
  const menuItemId = String(form.get('menuItemId') || '').trim()
  if (!(file instanceof File)) return fail('Image file is required.')
  if (!/^[a-z0-9-]{2,80}$/.test(menuItemId)) return fail('A valid menu item ID is required so the image URL can be saved to the menu.')
  if (file.size < 1 || file.size > max) return fail(`Image must be no larger than ${Math.floor(max / 1024 / 1024)} MB.`, 413)
  const ext = MIME_EXT[file.type]
  if (!ext) return fail('Only JPEG, PNG, WebP and AVIF images are accepted.')
  const existing = await env.DB.prepare('SELECT id FROM menu_items WHERE id=?').bind(menuItemId).first<{id:string}>()
  if (!existing) return fail('Menu item not found. Save the menu item before uploading its image.', 404)
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!hasValidSignature(bytes, file.type)) return fail('The uploaded file content does not match its image type.')

  const endpoint = env.IMAGEKIT_URL_ENDPOINT.replace(/\/+$/, '')
  let endpointUrl: URL
  try { endpointUrl = new URL(endpoint) } catch { return fail('Image storage endpoint is invalid.', 503) }
  if (endpointUrl.protocol !== 'https:' || endpointUrl.hostname !== 'ik.imagekit.io') return fail('Image storage endpoint must be a valid HTTPS ImageKit endpoint.', 503)

  const uploadForm = new FormData()
  const uploadName = safeFileName(file.name, ext)
  uploadForm.append('file', new Blob([bytes], { type: file.type }), uploadName)
  uploadForm.append('fileName', uploadName)
  uploadForm.append('folder', '/eat2smile/menu')
  uploadForm.append('useUniqueFileName', 'true')
  uploadForm.append('overwriteFile', 'false')
  uploadForm.append('tags', `eat2smile,menu,${menuItemId}`)
  const authorization = btoa(`${env.IMAGEKIT_PRIVATE_KEY}:`)
  let imageResponse: Response
  try {
    imageResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', headers: { Authorization: `Basic ${authorization}` }, body: uploadForm })
  } catch { return fail('Image storage could not be reached. Please try again.', 502) }
  const imageData = await imageResponse.json().catch(() => null) as { url?: string; fileId?: string; filePath?: string; name?: string; error?: { message?: string } } | null
  if (!imageResponse.ok || !imageData?.url || !imageData.fileId) return fail(imageData?.error?.message || 'ImageKit rejected the upload. Please check the storage configuration and try again.', imageResponse.status >= 500 ? 502 : 400)
  let uploadedUrl: URL
  try { uploadedUrl = new URL(imageData.url) } catch { return fail('Image storage returned an invalid image URL.', 502) }
  if (uploadedUrl.protocol !== 'https:' || uploadedUrl.hostname !== endpointUrl.hostname || !uploadedUrl.pathname.startsWith(endpointUrl.pathname.replace(/\/$/, '') + '/')) return fail('Image storage returned an unexpected URL. The uploaded asset may need cleanup.', 502)

  try {
    await env.DB.prepare("UPDATE menu_items SET image_url=?, updated_at=datetime('now') WHERE id=?").bind(imageData.url, menuItemId).run()
  } catch { return fail('The image uploaded, but its menu record could not be updated. Retry after checking the menu item.', 500) }
  return json({ ok: true, menuItemId, fileId: imageData.fileId, filePath: imageData.filePath, url: imageData.url }, 201)
}
