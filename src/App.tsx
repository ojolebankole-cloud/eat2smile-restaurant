import { useEffect, useMemo, useRef, useState, type SyntheticEvent, type FormEvent } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Clock3, Heart, Instagram, Mail, MapPin, Menu, Minus, Phone, Plus, Search, ShoppingBag, Sparkles, Trash2, X, MessageCircle, Utensils, Truck, Download, Printer, ClipboardList } from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { categories, formatNaira, products, WHATSAPP_NUMBER, type Product } from './data'

gsap.registerPlugin(ScrollTrigger)

type CartItem = { product: Product; quantity: number }
type CartToast = { id: number; name: string }
const ACCENT_COLOURS = [
  { colour: '#ff6b00', foreground: '#ffffff' },
  { colour: '#E63946', foreground: '#ffffff' },
  { colour: '#FF8C00', foreground: '#ffffff' },
  { colour: '#FFC300', foreground: '#1c1c1c' },
  { colour: '#6F1D1D', foreground: '#ffffff' }
]
const CONTACT_EMAIL = 'davidajulo4@gmail.com'
const snackQuotes = [
  'A good snack is never just a snack. It is the little plot twist in a long day, the crispy pause between responsibilities, and the tiny celebration you did not know you needed. One bite can turn the mood around, but a box to share can turn an ordinary evening into a proper memory.',
  'Some people journal, some people take long walks, and some of us hear the unmistakable call of golden fries. There is no shame in answering that call. Let the crunch be loud, the sauce be generous, and the moment be yours. Happiness sometimes arrives in a paper pack with extra napkins.',
  'The perfect snack understands timing. It shows up when the group chat is active, when the film reaches the good part, when the rain starts tapping the window, or when you simply deserve something lovely. Keep the conversation flowing, pass the plate around, and never underestimate the power of one more bite.',
  'A burger in one hand and a milkshake in the other is a very convincing argument for slowing down. Let the world wait a minute. Enjoy the warm bite, the cool sip, the familiar flavour, and the small joy of having exactly what you were craving. You can return to being productive after the last crumb.'
]
const readCart = (): CartItem[] => {
  try {
    const value = JSON.parse(localStorage.getItem('eat2smile-cart') || '[]')
    return Array.isArray(value) ? value.filter((item: CartItem) => item?.product?.id && Number.isFinite(item.quantity) && item.quantity > 0) : []
  } catch { return [] }
}
const createOrderAccessToken = () => { const bytes=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'') }
const analyticsIdentity = () => {
  let visitorId=localStorage.getItem('eat2smile-visitor-id')||''
  if(!/^[a-f0-9-]{32,64}$/i.test(visitorId)){visitorId=crypto.randomUUID();localStorage.setItem('eat2smile-visitor-id',visitorId)}
  let sessionId=localStorage.getItem('eat2smile-session-id')||'',started=Number(localStorage.getItem('eat2smile-session-start')||0)
  if(!/^[a-f0-9-]{32,64}$/i.test(sessionId)||!started||Date.now()-started>30*60*1000){sessionId=crypto.randomUUID();localStorage.setItem('eat2smile-session-id',sessionId);localStorage.setItem('eat2smile-session-start',String(Date.now()))}
  return {visitorId,sessionId}
}
const trackAnalytics = (eventType:string,data:Record<string,string|number>={}) => {
  try{const {visitorId,sessionId}=analyticsIdentity();fetch('/api/analytics/visit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({visitorId,sessionId,eventType,path:window.location.pathname,referrer:document.referrer,data})}).catch(()=>{})}catch{}
}
const readOrderTokens = (): Record<string,string> => { try { const value=JSON.parse(localStorage.getItem('eat2smile-order-tokens')||'{}'); return value&&typeof value==='object'&&!Array.isArray(value)?value:{} } catch { return {} } }
const routeFromPath = () => { const path=window.location.pathname.replace(/\/+$/,'')||'/'; return ({'/':'home','/menu':'menu','/order':'order','/about':'about','/find-us':'find-us','/contact':'contact','/orders':'orders'} as Record<string,string>)[path]||'home' }
const readFavourites = (): string[] => {
  try {
    const value = JSON.parse(localStorage.getItem('eat2smile-favourites') || '[]')
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && /^[a-z0-9-]{2,80}$/.test(id)))] : []
  } catch { return [] }
}

const unsplashFallbacks: Record<string, string> = {
  Burgers: 'photo-1568901346375-23c9450c58cd',
  Pizza: 'photo-1628840042765-356cda07504e',
  'Shawarma & Snacks': 'photo-1529006557810-274b9b2fc783',
  Sides: 'photo-1573080496219-bb080dd4f877',
  Drinks: 'photo-1572490122747-3968b75cc699',
  Desserts: 'photo-1562376552-0d160a2f238d',
  default: 'photo-1555939594-58d7cb561ad1'
}
const fallbackImage = (event: SyntheticEvent<HTMLImageElement>, category = 'default') => {
  const image = event.currentTarget
  image.onerror = null
  image.src = `https://images.unsplash.com/${unsplashFallbacks[category] || unsplashFallbacks.default}?auto=format&fit=crop&w=900&q=80`
}
const heroSlides = [
  { image: 'photo-1568901346375-23c9450c58cd', alt: 'Juicy cheeseburger with fresh toppings', label: 'THE BURGER MOMENT', note: 'STACKED. SAUCY. SATISFYING.' },
  { image: 'photo-1628840042765-356cda07504e', alt: 'Freshly baked pepperoni pizza', label: 'PIZZA NIGHT, ANYTIME', note: 'A SLICE OF PURE JOY.' },
  { image: 'photo-1529006557810-274b9b2fc783', alt: 'Freshly prepared shawarma wrap', label: 'WRAPPED WITH FLAVOUR', note: 'BIG TASTE IN EVERY BITE.' },
  { image: 'photo-1573080496219-bb080dd4f877', alt: 'Golden crispy french fries', label: 'THE PERFECT SIDEKICK', note: 'CRUNCH INTO HAPPINESS.' }
]

function AtSignIcon() { return <span className="at-sign-icon" aria-hidden="true">@</span> }

function App() {
  const [cart, setCart] = useState<CartItem[]>(readCart)
  const [menuProducts, setMenuProducts] = useState<Product[]>(products)
  const [favourites, setFavourites] = useState<string[]>(readFavourites)
  const [toast, setToast] = useState<CartToast | null>(null)
  const [floatingCartVisible, setFloatingCartVisible] = useState(() => typeof window !== 'undefined' && window.scrollY > 420)
  const toastTimer = useRef<number | undefined>(undefined)
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [minPrice,setMinPrice]=useState('')
  const [maxPrice,setMaxPrice]=useState('')
  const [availableOnly,setAvailableOnly]=useState(true)
  const [couponCode,setCouponCode]=useState('')
  const [referralCode,setReferralCode]=useState('')
  const [loyaltyInfo,setLoyaltyInfo]=useState<any>(null)
  const [couponMessage,setCouponMessage]=useState('')
  const [couponDiscount,setCouponDiscount]=useState(0)
  const [campaigns,setCampaigns]=useState<any[]>([])
  const [publicReviews,setPublicReviews]=useState<any[]>([])
  const [notificationEmail,setNotificationEmail]=useState('')
  const [notificationMessage,setNotificationMessage]=useState('')
  const [reviewRating,setReviewRating]=useState(5)
  const [reviewComment,setReviewComment]=useState('')
  const [reviewMessage,setReviewMessage]=useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [page, setPage] = useState(routeFromPath)
  const [selected, setSelected] = useState<Product | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [orderType, setOrderType] = useState<'Delivery'|'Pickup'>('Delivery')
  const [customer, setCustomer] = useState({name:'', phone:'', email:'', address:'', instructions:''})
  const [paymentMethod,setPaymentMethod]=useState<'Online'|'WhatsApp'>('WhatsApp')
  const [paymentNotice,setPaymentNotice]=useState('')
  const [formError, setFormError] = useState('')
  const [copied, setCopied] = useState(false)
  const [orderReference] = useState(() => `DRAFT-${Date.now().toString(36).toUpperCase()}`)
  const [orderAttemptKey, setOrderAttemptKey] = useState(()=>{try{const saved=localStorage.getItem('eat2smile-order-attempt');return saved&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved)?saved:crypto.randomUUID()}catch{return crypto.randomUUID()}})
  const [orderAccessToken, setOrderAccessToken] = useState(()=>{try{return localStorage.getItem('eat2smile-order-access')||createOrderAccessToken()}catch{return createOrderAccessToken()}})
  const [accountOpen, setAccountOpen] = useState(false)
  const [authError, setAuthError] = useState('')
  const [orders, setOrders] = useState<Array<{id:string;reference:string;status:string;orderType:string;subtotal:number;total:number;createdAt:string}>>([])
  const [orderDetail, setOrderDetail] = useState<any>(null)
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<{id:string;reference:string;status:string;total:number;accessToken:string;paymentMethod:'Online'|'WhatsApp';paymentStatus:string;items:Array<{name:string;quantity:number;lineTotal:number}>}|null>(null)
  const [trackForm, setTrackForm] = useState({reference:'',phone:''})
  const [recoverForm, setRecoverForm] = useState({reference:'',phone:''})
  const [trackedOrder, setTrackedOrder] = useState<any>(null)
  const [contactSent, setContactSent] = useState(false)
  const [contact, setContact] = useState({name:'', email:'', message:''})
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [heroSlide, setHeroSlide] = useState(0)
  const heroTouchStart = useRef<number | null>(null)
  const lastNotifiedOrderStatus=useRef<string>('')
  const heroDirection = useRef(1)
  const changeHeroSlide = (direction: number) => {
    heroDirection.current = direction
    setHeroSlide(current => (current + direction + heroSlides.length) % heroSlides.length)
  }
  const heroRef = useRef<HTMLElement>(null)
  const quoteRef = useRef<HTMLElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLElement>(null)

  useEffect(()=>{const visitor=analyticsIdentity().visitorId;fetch(`/api/favorites?visitor=${encodeURIComponent(visitor)}`).then(r=>r.ok?r.json():null).then(d=>{if(d?.favorites?.length){setFavourites(d.favorites);localStorage.setItem('eat2smile-favourites',JSON.stringify(d.favorites))}}).catch(()=>{});fetch('/api/promotions').then(r=>r.ok?r.json():null).then(d=>setCampaigns(d?.campaigns||[])).catch(()=>{});fetch('/api/reviews').then(r=>r.ok?r.json():null).then(d=>setPublicReviews(d?.reviews||[])).catch(()=>{})},[])
  useEffect(() => { if(activeCategory && activeCategory!=='All' && activeCategory!=='Favourites') trackAnalytics('category_view',{category:activeCategory}) },[activeCategory])
  useEffect(() => { const term=search.trim();if(term.length<2)return;const timer=window.setTimeout(()=>trackAnalytics('search',{searchLength:term.length}),800);return()=>window.clearTimeout(timer) },[search])
  useEffect(() => { if(selected) trackAnalytics('product_view',{productId:selected.id,productName:selected.name,category:selected.category}) },[selected?.id])
  useEffect(() => {
    if (page === 'orders') return
    trackAnalytics('page_view')
  }, [page])
  useEffect(() => { localStorage.setItem('eat2smile-cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => { const sync=()=>setPage(routeFromPath());window.addEventListener('popstate',sync);document.body.dataset.page=page;const titles:Record<string,string>={home:'Eat2Smile | Good Food, Good Mood in Abuja',menu:'Eat2Smile Menu | Abuja',order:'Order Food Online in Abuja | Eat2Smile',about:'About Eat2Smile | Abuja','find-us':'Find Eat2Smile | Iddo Sarki, Abuja',contact:'Contact Eat2Smile | Abuja','orders':'Your Order History | Eat2Smile'};const descriptions:Record<string,string>={home:'Discover Eat2Smile in Iddo Sarki, Abuja. Explore burgers, pizza, shawarma, snacks, drinks and desserts, then order directly as a guest.',menu:'Explore the Eat2Smile food menu in Abuja. Discover burgers, pizza, shawarma, snacks, sides, drinks and desserts.',order:'Order food from Eat2Smile in Abuja. Choose delivery or pickup and place your order as a guest without signing in.',about:'Learn about Eat2Smile, a feel-good food destination in Abuja, Nigeria. Good food, good mood and every bite comes with a smile.', 'find-us':'Find Eat2Smile opposite Redeemed Christian Church of God in Iddo Sarki, Abuja. Open the map for directions or contact us before visiting.',contact:'Contact Eat2Smile in Iddo Sarki, Abuja through WhatsApp, Instagram, telephone or email for orders and enquiries.','orders':'View and securely retrieve your Eat2Smile guest orders on this device.'};document.title=titles[page]||titles.home;let meta=document.querySelector('meta[name=description]') as HTMLMetaElement|null;if(!meta){meta=document.createElement('meta');meta.name='description';document.head.appendChild(meta)}meta.content=descriptions[page]||descriptions.home;let canonical=document.querySelector('link[rel=canonical]') as HTMLLinkElement|null;if(canonical)canonical.href=`https://eat2smile-restaurant.pages.dev${window.location.pathname}`;if(page==='orders'){setAccountOpen(true);loadOrders().catch(e=>setAuthError(e.message))}return()=>window.removeEventListener('popstate',sync)},[page])
  useEffect(() => { localStorage.setItem('eat2smile-order-attempt',orderAttemptKey) }, [orderAttemptKey])
  useEffect(() => { localStorage.setItem('eat2smile-order-access',orderAccessToken) }, [orderAccessToken])
  useEffect(() => { localStorage.setItem('eat2smile-favourites', JSON.stringify(favourites)) }, [favourites])
  useEffect(()=>{const status=orderDetail?.order?.status;if(!status)return;if(lastNotifiedOrderStatus.current&&lastNotifiedOrderStatus.current!==status&&localStorage.getItem('eat2smile-order-notifications')==='1'&&'Notification' in window&&Notification.permission==='granted'){new Notification(`Eat2Smile order ${orderDetail.order.reference}`,{body:`Your order status is now ${status}.`})}lastNotifiedOrderStatus.current=status},[orderDetail?.order?.status])
  useEffect(() => {if(!orderDetail?.order?.reference)return;const token=readOrderTokens()[orderDetail.order.reference]||'';if(!token)return;fetch(`/api/loyalty?reference=${encodeURIComponent(orderDetail.order.reference)}&accessToken=${encodeURIComponent(token)}`).then(r=>r.ok?r.json():null).then(setLoyaltyInfo).catch(()=>{})},[orderDetail?.order?.reference])
  useEffect(() => { if(!orderDetail?.order?.id)return; const tokens=readOrderTokens();const token=tokens[orderDetail.order.reference]||'';const timer=window.setInterval(()=>{fetch(`/api/orders/${orderDetail.order.id}`,{headers:token?{Authorization:`Bearer ${token}`}:{}}).then(r=>r.ok?r.json():null).then(data=>{if(data)setOrderDetail(data)}).catch(()=>{})},15000); return ()=>window.clearInterval(timer) }, [orderDetail?.order?.id])
  useEffect(() => { if(!accountOpen||!trackedOrder?.order?.reference)return; const timer=window.setInterval(()=>{fetch('/api/track',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(trackForm)}).then(r=>r.ok?r.json():null).then(data=>{if(data)setTrackedOrder(data)}).catch(()=>{})},15000); return ()=>window.clearInterval(timer) }, [accountOpen,trackedOrder?.order?.reference,trackForm.reference,trackForm.phone])
  useEffect(() => { fetch('/api/menu').then(r=>r.ok?r.json():null).then(data=>{if(Array.isArray(data?.items)&&data.items.length)setMenuProducts(data.items.map((item:any)=>({...item,price:Number(item.price)})))}).catch(()=>{}) }, [])
  useEffect(() => {
    let colourIndex = 0
    const root = document.documentElement
    root.style.setProperty('--orange', ACCENT_COLOURS[colourIndex].colour)
    root.style.setProperty('--accent-foreground', ACCENT_COLOURS[colourIndex].foreground)
    root.dataset.accentIndex = String(colourIndex)
    const timer = window.setInterval(() => {
      colourIndex = (colourIndex + 1) % ACCENT_COLOURS.length
      root.style.setProperty('--orange', ACCENT_COLOURS[colourIndex].colour)
      root.style.setProperty('--accent-foreground', ACCENT_COLOURS[colourIndex].foreground)
      root.dataset.accentIndex = String(colourIndex)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    const updateVisibility = () => setFloatingCartVisible(window.scrollY > 420)
    updateVisibility()
    window.addEventListener('scroll', updateVisibility, { passive: true })
    return () => window.removeEventListener('scroll', updateVisibility)
  }, [])
  useEffect(() => () => { if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current) }, [])
  useEffect(() => {
    const ctx = gsap.context(() => {
      const intro = introRef.current
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (intro && !sessionStorage.getItem('eat2smile-intro') && !reduced) {
        const tl = gsap.timeline({
          onComplete: () => {
            intro.style.pointerEvents = 'none'
            sessionStorage.setItem('eat2smile-intro', '1')
          }
        })
        tl.to('.loader-mark', { scale: 1, rotation: 360, opacity: 1, duration: .65, ease: 'back.out(1.8)' })
          .to('.loader-word', { y: 0, opacity: 1, duration: .55, stagger: .075, ease: 'power4.out' }, '-=.2')
          .to('.loader-progress span', { scaleX: 1, duration: .7, ease: 'power2.inOut' }, '-=.25')
          .to(intro, { yPercent: -105, duration: .95, ease: 'power4.inOut', delay: .2 })
      } else if (intro) {
        intro.remove()
      }

      if (reduced) return

      const heroTimeline = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: .12 })
      heroTimeline
        .from('.hero-copy .eyebrow', { y: 24, opacity: 0, duration: .55 })
        .from('.hero h1 .hero-line', { yPercent: 115, rotate: 3, opacity: 0, duration: .8, stagger: .13 }, '-=.15')
        .from('.hero-lede, .hero-desc', { y: 22, opacity: 0, duration: .6, stagger: .12 }, '-=.35')
        .from('.hero-buttons > *', { y: 18, opacity: 0, duration: .55, stagger: .1 }, '-=.3')
        .from('.hero-proof', { y: 18, opacity: 0, duration: .5 }, '-=.25')
        .from('.hero-food', { scale: .72, rotation: -12, opacity: 0, duration: 1.25, ease: 'elastic.out(1,.72)' }, '-=.9')
        .from('.hero-sun', { scale: .45, opacity: 0, duration: .8 }, '-=1')
        .from('.hero-sticker, .float-chip', { scale: 0, rotation: -25, opacity: 0, duration: .6, stagger: .12, ease: 'back.out(1.8)' }, '-=.55')

      gsap.to('.float-chip.one', { y: -17, rotation: 7, duration: 2.8, repeat: -1, yoyo: true, ease: 'sine.inOut' })
      gsap.to('.float-chip.two', { y: 15, rotation: -8, duration: 3.3, repeat: -1, yoyo: true, ease: 'sine.inOut' })
      gsap.to('.hero-food', { y: -48, rotation: 3, ease: 'none', scrollTrigger: { trigger: heroRef.current, start: 'top top', end: 'bottom top', scrub: 1 } })
      gsap.to('.hero-bg-word', { yPercent: 32, xPercent: -5, ease: 'none', scrollTrigger: { trigger: heroRef.current, start: 'top top', end: 'bottom top', scrub: 1 } })
      gsap.to('.hero-ring', { rotation: 75, scale: 1.08, ease: 'none', scrollTrigger: { trigger: heroRef.current, start: 'top top', end: 'bottom top', scrub: 1 } })
      gsap.to('.hero-grid', { opacity: .16, ease: 'none', scrollTrigger: { trigger: heroRef.current, start: 'top top', end: 'bottom top', scrub: 1 } })

      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.fromTo(el, { y: 64, opacity: 0, clipPath: 'inset(0 0 12% 0)' }, {
          y: 0, opacity: 1, clipPath: 'inset(0 0 0% 0)', duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 86%', once: true }
        })
      })
      gsap.utils.toArray<HTMLElement>('.product-card').forEach((el, i) => {
        gsap.fromTo(el, { y: 42, opacity: 0, scale: .96 }, {
          y: 0, opacity: 1, scale: 1, duration: .65, delay: (i % 6) * .055, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 94%', once: true }
        })
      })
      gsap.to('.story-orbit', { rotation: 28, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.story-section', start: 'top bottom', end: 'bottom top', scrub: 1 } })
      gsap.fromTo('.story-visual img', { clipPath: 'inset(12% 12% 12% 12% round 45% 45% 12px 12px)', scale: 1.12 }, {
        clipPath: 'inset(0% 0% 0% 0% round 48% 48% 16px 16px)', scale: 1, duration: 1.2, ease: 'power3.out',
        scrollTrigger: { trigger: '.story-visual', start: 'top 82%', once: true }
      })
      gsap.fromTo('.promo-image', { x: 100, rotation: 9, opacity: 0, scale: .9 }, {
        x: 0, rotation: -4, opacity: 1, scale: 1, duration: 1.15, ease: 'power3.out',
        scrollTrigger: { trigger: '.promo-section', start: 'top 78%', once: true }
      })
      gsap.to('.promo-scribble', { rotation: 8, x: -24, ease: 'none', scrollTrigger: { trigger: '.promo-section', start: 'top bottom', end: 'bottom top', scrub: 1 } })

      ScrollTrigger.create({
        start: 0, end: 'max', onUpdate: self => gsap.set('.reading-progress span', { scaleX: self.progress })
      })
    })
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    const section = quoteRef.current
    if (!section) return
    let visible = false
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting }, { threshold: 0.25 })
    observer.observe(section)
    const timer = window.setInterval(() => { if (!visible) setQuoteIndex(index => (index + 1) % snackQuotes.length) }, 5200)
    return () => { observer.disconnect(); window.clearInterval(timer) }
  }, [])

  const filtered = useMemo(() => menuProducts.filter(p => (activeCategory === 'All' || (activeCategory === 'Favourites' ? favourites.includes(p.id) : p.category === activeCategory)) && (p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())) && (!availableOnly || (p as any).available!==false) && (!minPrice || p.price>=Number(minPrice)) && (!maxPrice || p.price<=Number(maxPrice))), [activeCategory, search, favourites, menuProducts,availableOnly,minPrice,maxPrice])
  const count = cart.reduce((sum,item)=>sum+item.quantity,0)
  const subtotal = cart.reduce((sum,item)=>sum+item.product.price*item.quantity,0)

  const add = (product:Product) => {
    trackAnalytics('add_to_cart',{productId:product.id,productName:product.name,category:product.category,itemCount:count+1,cartValue:subtotal+product.price})
    rotateOrderAttempt()
    setCart(old => {
      const found = old.find(i=>i.product.id===product.id)
      return found ? old.map(i=>i.product.id===product.id?{...i,quantity:i.quantity+1}:i) : [...old,{product,quantity:1}]
    })
    setToast({ id: Date.now(), name: product.name })
    if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3000)
  }
  const toggleFavourite = (productId: string) => {const addFavourite=!favourites.includes(productId);setFavourites(current=>addFavourite?[...current,productId]:current.filter(id=>id!==productId));try{localStorage.setItem('eat2smile-favourites',JSON.stringify(addFavourite?[...favourites,productId]:favourites.filter(id=>id!==productId)));fetch('/api/favorites',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({visitor:analyticsIdentity().visitorId,menuItemId:productId,action:addFavourite?'add':'remove'})}).catch(()=>{})}catch{}}
  const changeQty = (id:string, delta:number) => { rotateOrderAttempt(); setCart(old => old.map(i=>i.product.id===id?{...i,quantity:i.quantity+delta}:i).filter(i=>i.quantity>0)) }
  const remove = (id:string) => {rotateOrderAttempt();setCart(old=>old.filter(i=>i.product.id!==id))}
  const scrollTo = (id:string) => { setMobileOpen(false); document.getElementById(id)?.scrollIntoView({behavior:'smooth'}) }
  const rotateOrderAttempt = () => {const key=crypto.randomUUID(),token=createOrderAccessToken();setOrderAttemptKey(key);setOrderAccessToken(token);try{localStorage.setItem('eat2smile-order-attempt',key);localStorage.setItem('eat2smile-order-access',token)}catch{}}
  const updateCheckoutCustomer = (field:keyof typeof customer,value:string) => {setCustomer(current=>({...current,[field]:value}));rotateOrderAttempt()}

  const orderText = () => {
    const reference = orderReference
    const lines = cart.map(i=>`• ${i.product.name} x${i.quantity} — ${formatNaira(i.product.price*i.quantity)}`).join('\n')
    return `EAT2SMILE ORDER REQUEST\nDraft reference: ${reference} (server reference is assigned after successful submission)\n\n${lines}\n\nSubtotal: ${formatNaira(subtotal)}\nOrder type: ${orderType}\nCustomer: ${customer.name}\nCustomer phone: ${customer.phone}${orderType==='Delivery'?`\nDelivery address: ${customer.address}`:''}${customer.instructions.trim()?`\nOrder instructions: ${customer.instructions.trim()}`:''}\n\nPlease confirm item availability, delivery fee (if applicable), estimated preparation/delivery time and payment instructions. This order request is not confirmed until the restaurant accepts it. Thank you!`
  }
  const apiRequest = async (url:string, options:RequestInit={}) => {
    const response = await fetch(url,{...options,credentials:'same-origin',headers:{...(options.body instanceof FormData?{}:{'content-type':'application/json'}),...(options.headers||{})}})
    const data = await response.json().catch(()=>({error:'Unexpected server response.'}))
    if(!response.ok) throw new Error(data.error || 'The request could not be completed.')
    return data
  }
  const loadOrders = async () => { const tokens=Object.values(readOrderTokens()).slice(-100);const data=await apiRequest('/api/orders/history',{method:'POST',body:JSON.stringify({tokens})});setOrders(data.orders||[]) }
  const startOnlinePayment = async (order:{id:string;reference:string;total:number;accessToken:string}) => {
    setPaymentNotice('Connecting securely to Flutterwave…')
    const data=await apiRequest('/api/payments/flutterwave/initiate',{method:'POST',body:JSON.stringify({orderId:order.id,accessToken:order.accessToken})})
    const sessions=(()=>{try{return JSON.parse(localStorage.getItem('eat2smile-payment-sessions')||'{}')}catch{return {}}})()
    sessions[data.txRef]={id:order.id,reference:order.reference,accessToken:order.accessToken,total:order.total}
    localStorage.setItem('eat2smile-payment-sessions',JSON.stringify(sessions))
    window.location.assign(data.checkoutUrl)
  }
  const submitReview=async()=>{if(!orderDetail?.order||orderDetail.order.status!=='Delivered')return;try{const tokens=readOrderTokens(),accessToken=tokens[orderDetail.order.reference]||'';const d=await apiRequest('/api/reviews',{method:'POST',body:JSON.stringify({reference:orderDetail.order.reference,phone:orderDetail.order.phone,accessToken,rating:reviewRating,comment:reviewComment,displayName:orderDetail.order.customerName})});setReviewMessage(d.message);setReviewComment('')}catch(e){setReviewMessage(e instanceof Error?e.message:'Unable to submit review.')}}
  const applyCoupon=async()=>{setCouponMessage('Checking coupon…');try{const d=await apiRequest('/api/coupons',{method:'POST',body:JSON.stringify({code:couponCode,subtotal,phone:customer.phone})});setCouponDiscount(Number(d.discount)||0);setCouponMessage(`${d.code} applied — save ${formatNaira(d.discount)}.`)}catch(e){setCouponDiscount(0);setCouponMessage(e instanceof Error?e.message:'Coupon could not be checked.')}}
  const submitOrder = async () => {
    if (!cart.length) { setFormError('Your cart is empty. Add something delicious before checkout.'); return }
    if (!customer.name.trim() || !customer.phone.trim() || (orderType==='Delivery' && !customer.address.trim())) { setFormError('Please complete your name, active phone number and delivery address where required.'); return }
    if(paymentMethod==='Online'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())){setFormError('Enter a valid email address for your Flutterwave payment receipt.');return}
    const digits = customer.phone.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 15) { setFormError('Enter a valid phone number with at least 10 digits.'); return }
    setFormError('');setPaymentNotice('')
    trackAnalytics('checkout_started',{itemCount:count,cartValue:subtotal})
    setSubmittingOrder(true)
    try {
      const data=await apiRequest('/api/orders',{method:'POST',body:JSON.stringify({items:cart.map(i=>({id:i.product.id,quantity:i.quantity})),idempotencyKey:orderAttemptKey,accessToken:orderAccessToken,orderType,name:customer.name,phone:customer.phone,email:customer.email,paymentMethod,couponCode:couponDiscount?couponCode:'',referralCode,address:orderType==='Delivery'?customer.address:'',instructions:customer.instructions})})
      trackAnalytics('order_submitted',{itemCount:count,cartValue:subtotal});const tokens=readOrderTokens();tokens[data.order.reference]=data.accessToken;localStorage.setItem('eat2smile-order-tokens',JSON.stringify(tokens))
      setCouponCode('');setCouponDiscount(0);setCouponMessage('');setReferralCode('')
      const actualPaymentMethod: 'Online'|'WhatsApp'=data.order.paymentMethod==='Online'?'Online':'WhatsApp'
      const savedOrder={id:data.order.id,reference:data.order.reference,total:Number(data.order.total),accessToken:data.accessToken}
      setOrderSuccess({id:data.order.id,reference:data.order.reference,status:data.order.status,total:Number(data.order.total),accessToken:data.accessToken,paymentMethod:actualPaymentMethod,paymentStatus:data.order.paymentStatus||'Unconfirmed',items:cart.map(item=>({name:item.product.name,quantity:item.quantity,lineTotal:item.product.price*item.quantity}))})
      localStorage.removeItem('eat2smile-order-attempt');rotateOrderAttempt();setCart([]);setCheckoutOpen(false);setCartOpen(false);await loadOrders()
      if(actualPaymentMethod==='Online'){
        try{await startOnlinePayment(savedOrder)}catch(error){setPaymentNotice(error instanceof Error?error.message:'Online payment could not be started. Your order is saved and remains unpaid.')}
      }
    } catch(error) { const message=error instanceof Error?error.message:'Order could not be saved.';setFormError(message) } finally {setSubmittingOrder(false)}
  }
  useEffect(()=>{
    if(window.location.pathname!=='/order'||new URLSearchParams(window.location.search).get('payment_callback')!=='1')return
    const params=new URLSearchParams(window.location.search),txRef=params.get('tx_ref')||'',transactionId=params.get('transaction_id')||'',status=params.get('status')||''
    const sessions=(()=>{try{return JSON.parse(localStorage.getItem('eat2smile-payment-sessions')||'{}')}catch{return {}}})()
    const session=sessions[txRef]
    window.history.replaceState({},'', '/order')
    if(!session){setPaymentNotice('Payment return received, but this browser could not find the saved order session. Your order is still protected; contact Eat2Smile with your order reference if needed.');return}
    if(status!=='successful'||!transactionId){setOrderSuccess({id:session.id,reference:session.reference,status:'New',total:Number(session.total),accessToken:session.accessToken,paymentMethod:'Online',paymentStatus:'Pending',items:[]});setPaymentNotice('Payment was not confirmed. Your order remains saved and unpaid. You can retry online payment.');return}
    apiRequest('/api/payments/flutterwave/verify',{method:'POST',body:JSON.stringify({txRef,transactionId,accessToken:session.accessToken})}).then(async result=>{
      delete sessions[txRef];localStorage.setItem('eat2smile-payment-sessions',JSON.stringify(sessions));setPaymentNotice(`Payment confirmed successfully for ${session.reference}.`);setOrderSuccess({id:session.id,reference:session.reference,status:'New',total:Number(session.total),accessToken:session.accessToken,paymentMethod:'Online',paymentStatus:'Paid',items:[]});await loadOrders()
    }).catch(error=>setPaymentNotice(error instanceof Error?error.message:'Payment verification is still pending. We will update the order when Flutterwave confirms it.'))
  // The callback must be processed once on page load, using the locally stored order access token.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])
  const openOrder = async (orderId:string, suppliedToken='') => {try{const order=orders.find(item=>item.id===orderId);const token=suppliedToken||(order?readOrderTokens()[order.reference]:'');const response=await fetch(`/api/orders/${orderId}`,{headers:token?{Authorization:`Bearer ${token}`}:{}});const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to load order.');setOrderDetail(data)}catch(error){setAuthError(error instanceof Error?error.message:'Unable to load order.')}}
  const repeatOrder = (detail:any) => {const next=(detail.items||[]).map((line:any)=>{const product=menuProducts.find(p=>p.id===line.menuItemId||p.name===line.name);return product?{product,quantity:line.quantity}:null}).filter(Boolean) as CartItem[];if(!next.length){setAuthError('The original items are no longer in the current menu.');return}rotateOrderAttempt();setCart(next);setOrderType(detail.order.orderType);setCustomer(c=>({...c,name:detail.order.customerName||c.name,phone:detail.order.phone||c.phone,address:detail.order.address||c.address,instructions:detail.order.instructions||'',email:detail.order.email||c.email}));setOrderDetail(null);setAccountOpen(false);setCheckoutOpen(true)}
  const trackOrder = async (event:FormEvent<HTMLFormElement>) => {event.preventDefault();setAuthError('');try{setTrackedOrder(await apiRequest('/api/track',{method:'POST',body:JSON.stringify(trackForm)}))}catch(error){setAuthError(error instanceof Error?error.message:'Unable to track this order.')}}
  const recoverOrder = async (event:FormEvent<HTMLFormElement>) => {event.preventDefault();setAuthError('');try{const data=await apiRequest('/api/orders/recover',{method:'POST',body:JSON.stringify(recoverForm)});const tokens=readOrderTokens();tokens[data.order.reference]=data.accessToken;localStorage.setItem('eat2smile-order-tokens',JSON.stringify(tokens));await loadOrders();setRecoverForm({reference:'',phone:''});await openOrder(data.order.id,data.accessToken)}catch(error){setAuthError(error instanceof Error?error.message:'Unable to recover this order.')}}
  const sendContactMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const subject = encodeURIComponent(`Eat2smile website enquiry from ${contact.name}`)
    const body = encodeURIComponent(`Name: ${contact.name}\nReply email: ${contact.email}\n\nMessage:\n${contact.message}`)
    setContactSent(true)
    window.setTimeout(() => { window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}` }, 180)
  }
  const copyOrder = async () => {
    try { await navigator.clipboard.writeText(orderText()); setCopied(true); setTimeout(()=>setCopied(false),2200) } catch { setFormError('Clipboard access is unavailable in this browser.') }
  }
  const downloadOrderImage = () => {
    if (!cart.length) { setFormError('Add items to your order before creating a summary.'); return }
    const canvas = document.createElement('canvas')
    const width = 1000, padding = 76, lineHeight = 42
    const lines = [
      'EAT2SMILE  |  ORDER SUMMARY', `Draft reference: ${orderReference}`, `Date: ${new Date().toLocaleString('en-NG')}`, '',
      ...cart.map(item => `${item.product.name}  x${item.quantity}     ${formatNaira(item.product.price * item.quantity)}`), '',
      `Subtotal: ${formatNaira(subtotal)}`, `Order type: ${orderType}`, `Customer: ${customer.name || 'Not provided'}`,
      `Phone: ${customer.phone || 'Not provided'}`, ...(orderType === 'Delivery' ? [`Address: ${customer.address || 'Not provided'}`] : []),
      ...(customer.instructions.trim() ? [`Note: ${customer.instructions.trim()}`] : []), '',
      'This is an order request. It is confirmed when the restaurant accepts it.', 'Eat2smile will confirm availability, delivery fee and payment details.'
    ]
    canvas.width = width; canvas.height = padding * 2 + lines.length * lineHeight + 70
    const ctx = canvas.getContext('2d')
    if (!ctx) { setFormError('Could not create the order image on this browser.'); return }
    ctx.fillStyle = '#fffdf8'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ff6b00'; ctx.fillRect(0, 0, width, 20)
    ctx.fillStyle = '#1c1c1c'; ctx.font = 'bold 38px Arial'; ctx.fillText(lines[0], padding, 100)
    ctx.fillStyle = '#77736e'; ctx.font = '20px Arial'
    let y = 155
    lines.slice(1).forEach((line, index) => {
      if (!line) { y += 15; return }
      const isTotal = line.startsWith('Subtotal:')
      ctx.fillStyle = isTotal ? '#ff6b00' : (index > cart.length + 4 ? '#77736e' : '#292521')
      ctx.font = isTotal ? 'bold 28px Arial' : '22px Arial'
      const maxWidth = width - padding * 2
      const words = line.split(' '); let row = ''
      for (const word of words) {
        const test = row ? `${row} ${word}` : word
        if (ctx.measureText(test).width > maxWidth && row) { ctx.fillText(row, padding, y); y += 31; row = word } else row = test
      }
      if (row) { ctx.fillText(row, padding, y); y += lineHeight }
    })
    ctx.fillStyle = '#ffc928'; ctx.fillRect(padding, canvas.height - 48, width - padding * 2, 3)
    const link = document.createElement('a'); link.download = `Eat2smile-${orderReference}.png`; link.href = canvas.toDataURL('image/png'); link.click()
  }
  const escapeHtml = (value: string) => value.replace(/[&<>\"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[char] || char))
  const printOrderPdf = () => {
    if (!cart.length) { setFormError('Add items to your order before creating a summary.'); return }
    const rows = cart.map(item => `<tr><td>${escapeHtml(item.product.name)}</td><td>${item.quantity}</td><td>${formatNaira(item.product.price * item.quantity)}</td></tr>`).join('')
    const popup = window.open('', '_blank')
    if (!popup) { setFormError('Allow pop-ups to print or save your order as a PDF.'); return }
    popup.document.write(`<!doctype html><html><head><title>Eat2smile ${orderReference}</title><style>body{font:15px Arial,sans-serif;color:#1c1c1c;padding:36px;max-width:760px;margin:auto}h1{color:#ff6b00}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{text-align:left;padding:12px;border-bottom:1px solid #eee} .total{font-size:22px;font-weight:bold;color:#ff6b00}.muted{color:#777;line-height:1.6}@media print{button{display:none}}</style></head><body><h1>EAT2SMILE</h1><h2>Order summary</h2><p>Draft reference: ${orderReference}<br>Date: ${new Date().toLocaleString('en-NG')}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Subtotal: ${formatNaira(subtotal)}</p><p>Order type: ${orderType}<br>Customer: ${escapeHtml(customer.name || 'Not provided')}<br>Phone: ${escapeHtml(customer.phone || 'Not provided')}${orderType === 'Delivery' ? `<br>Address: ${escapeHtml(customer.address || 'Not provided')}` : ''}${customer.instructions.trim() ? `<br>Instructions: ${escapeHtml(customer.instructions.trim())}` : ''}</p><p class="muted">This is an order request. It is confirmed when the restaurant accepts it. Eat2smile will confirm availability, delivery fee and payment details.</p><button onclick="window.print()">Print / Save as PDF</button><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`)
    popup.document.close()
  }

  return <div className="site-shell">
    <div className="intro-overlay" ref={introRef} aria-hidden="true"><div className="loader-mark"><Utensils size={28}/></div><div className="loader-name"><span className="loader-word">EAT</span><span className="loader-word loader-orange">2</span><span className="loader-word">SMILE</span></div><small>GOOD FOOD IS ON THE WAY</small><div className="loader-progress"><span /></div></div>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <div className="announcement"><span><Sparkles size={13}/> BIG CRAVINGS. BIGGER SMILES.</span><span>Freshly made in Abuja <span className="announcement-dot">•</span> Order your favourites today</span></div>
    <header className="header">
      <a className="brand" href="/"><span className="brand-icon"><img src="/eat2smile-logo.png" alt="" width="38" height="38"/></span><span>EAT<span className="brand-two">2</span>SMILE<small>EVERY BITE, A SMILE.</small></span></a>
      <nav className="desktop-nav" aria-label="Main navigation"><a href="/">Home</a><a href="/menu">Menu</a><a href="/order">Order</a><a href="/about">About Us</a><a href="/find-us">Find Us</a><a href="/contact">Contact</a></nav>
      <div className="header-actions"><button className="search-trigger" onClick={()=>page==='home'?scrollTo('menu'):window.location.assign('/menu')} aria-label="Search menu"><Search size={19}/></button><a className="account-trigger" href="/orders"><ClipboardList size={17}/><span>My orders</span></a><button className="cart-trigger" onClick={()=>setCartOpen(true)}><ShoppingBag size={17}/> <span>My order</span><b>{count}</b></button><button className="mobile-menu-button" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">{mobileOpen?<X/>:<Menu/>}</button></div>
    </header>
    {mobileOpen && <div className="mobile-nav" role="navigation" aria-label="Mobile navigation"><a href="/">Home</a><a href="/menu">Menu</a><a href="/order">Order</a><a href="/about">About Us</a><a href="/find-us">Find Us</a><a href="/contact">Contact</a></div>}

    <main id="main-content">
      {paymentNotice&&!orderSuccess&&<div className="payment-return-notice" role="status">{paymentNotice}</div>}
      {(page==='order'||page==='menu'||page==='orders')&&<div className="route-intro"><span className="eyebrow">EAT2SMILE · ABUJA</span><h1>{page==='order'?'Build your order.':page==='orders'?'Your orders.':'Explore the menu.'}</h1><p>{page==='order'?'Choose your favourites, add them to your bag and check out as a guest. No account needed.':page==='orders'?'Review orders saved on this browser or recover a past order with its reference and the full phone number used at checkout.':'Fresh favourites, bold flavours and something for every kind of hungry.'}</p>{page==='order'?<button className="button button-orange" onClick={()=>setCartOpen(true)}>Open my order <ShoppingBag size={16}/></button>:page==='orders'?<button className="button button-orange" onClick={()=>{setAccountOpen(true);loadOrders().catch(e=>setAuthError(e.message))}}>View saved orders <ClipboardList size={16}/></button>:null}</div>}
      <section className="hero" id="home" ref={heroRef}>
        <div className="hero-bg-word">YUMMY!</div><div className="hero-grid"></div>
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line"></span> MADE FRESH. SERVED HAPPY.</div>
          <h1><span className="hero-line-wrap"><span className="hero-line">GOOD FOOD.</span></span><span className="hero-line-wrap"><em className="hero-line">GOOD MOOD.</em></span></h1>
          <p className="hero-lede">Every bite comes with a smile.</p>
          <p className="hero-desc">Big flavour, feel-good food and little moments worth sharing. Your next favourite bite is right here.</p>
          <div className="hero-buttons"><button className="button button-dark" onClick={()=>scrollTo('menu')}>Explore the menu <ArrowUpRight size={17}/></button><a className="text-link" href="#story">Get to know us <ArrowDown size={15}/></a></div>
          <div className="hero-proof"><div className="proof-avatars"><span>🍔</span><span>🍕</span><span>🌯</span></div><div><strong>Made for your cravings</strong><small>Fresh favourites, all in one place.</small></div></div>
        </div>
        <div className="hero-art">
          <div className="hero-sun"></div><div className="hero-ring"></div><span className="hero-orbit-dot dot-a"></span><span className="hero-orbit-dot dot-b"></span><span className="hero-orbit-dot dot-c"></span>
          <div className="hero-slide-frame" onTouchStart={e=>{heroTouchStart.current=e.changedTouches[0].clientX}} onTouchEnd={e=>{if(heroTouchStart.current!==null){const delta=e.changedTouches[0].clientX-heroTouchStart.current;if(Math.abs(delta)>45)changeHeroSlide(delta<0?1:-1);heroTouchStart.current=null}}} aria-label="Swipe left or right to explore featured food">
            <img key={heroSlide} data-direction={heroDirection.current} className="hero-food" src={`https://images.unsplash.com/${heroSlides[heroSlide].image}?auto=format&fit=crop&w=1000&q=82`} alt={heroSlides[heroSlide].alt} fetchPriority="high" decoding="async" onError={e=>fallbackImage(e,'Burgers')}/>
            <div key={`caption-${heroSlide}`} className="hero-slide-caption"><strong>{heroSlides[heroSlide].label}</strong><small>{heroSlides[heroSlide].note}</small></div>
          </div>
          <div className="hero-slide-controls" aria-label="Featured food navigation">
            <button type="button" onClick={()=>changeHeroSlide(-1)} aria-label="Previous featured food">‹</button>
            <div className="hero-slide-dots">{heroSlides.map((slide,i)=><button key={slide.image} type="button" className={heroSlide===i?'active':''} onClick={()=>{heroDirection.current=i>heroSlide?1:-1;setHeroSlide(i)}} aria-label={`Show ${slide.label.toLowerCase()}`}/>)}</div>
            <button type="button" onClick={()=>changeHeroSlide(1)} aria-label="Next featured food">›</button>
          </div>
          <div className="float-chip one"><span>100%</span><small>CRAVE-WORTHY</small></div>
          <div className="float-chip two"><span>♥</span><small>MADE WITH JOY</small></div>
          <div className="hero-sticker">TAKE<br/>A BITE!<span>↘</span></div>
        </div>
        <div className="hero-bottom"><span className="swipe-prompt">← SWIPE TO EXPLORE →</span><span className="swipe-subprompt">Four cravings. One happy place.</span><button className="hero-next" onClick={()=>scrollTo('story')} aria-label="Go to the next section" title="Next section"><ArrowDown size={19}/><small>OUR STORY</small></button></div>
      </section>

      <section className="ticker" aria-label="Eat2smile promise"><div className="ticker-track">{Array.from({length:4}).map((_,i)=><span key={i}>GOOD FOOD <b>✳</b> GOOD MOOD <b>✳</b> BIG FLAVOUR <b>✳</b> BIGGER SMILES <b>✳</b></span>)}</div></section>

      {campaigns.length>0&&<section className="campaign-strip" aria-label="Current restaurant announcements">{campaigns.map((c:any)=><article key={c.id}>{c.image&&<img src={c.image} alt="" loading="lazy"/>}<span>{String(c.type).replace('_',' ')}</span><b>{c.title}</b><p>{c.message}</p>{c.link&&<a href={c.link}>Explore offer <ArrowRight size={14}/></a>}</article>)}</section>}
      <section className="story-section" id="story">
        <div className="story-copy" data-reveal><div className="eyebrow"><span className="eyebrow-line"></span> A LITTLE ABOUT US</div><h2>HAPPINESS<br/>IS <em>HOMEMADE.</em></h2><p>At Eat2smile, we believe good food has a way of making an ordinary day feel special. From the first crunch to the last bite, we're here for flavour, freshness and the joy of eating well.</p><a className="button button-orange" href="/menu">Find your happy bite <ArrowRight size={17}/></a></div>
        <div className="story-visual" data-reveal><div className="story-orbit"></div><img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80" alt="A table filled with a selection of prepared food" loading="lazy" decoding="async" onError={fallbackImage}/><div className="story-note"><span>THE SECRET INGREDIENT?</span><strong>A WHOLE LOT<br/>OF LOVE.</strong><b>☺</b></div></div>
      </section>

      <section className="menu-section" id="menu" ref={menuRef}>
        <div className="section-heading" data-reveal><div><div className="eyebrow"><span className="eyebrow-line"></span> THE GOOD STUFF</div><h2>MEET YOUR<br/><em>NEW CRAVING.</em></h2></div><p>Big bites, bold flavours and something for every kind of hungry. Go on, find your favourite.</p></div>
        <div className="menu-toolbar"><div className="category-tabs">{['All', 'Favourites', ...categories.filter(cat => cat !== 'All')].map(cat=><button key={cat} className={activeCategory===cat?'active':''} onClick={()=>setActiveCategory(cat)}>{cat === 'Favourites' ? <> <Heart size={12} fill={activeCategory === 'Favourites' ? 'currentColor' : 'none'}/> Favourites <span className="favourite-tab-count">{favourites.length}</span></> : cat}</button>)}</div><label className="menu-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a craving..." aria-label="Search the menu" /></label><div className="menu-filter-row"><label>Min ₦<input type="number" min="0" value={minPrice} onChange={e=>setMinPrice(e.target.value)} placeholder="0"/></label><label>Max ₦<input type="number" min="0" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="Any"/></label><label><input type="checkbox" checked={availableOnly} onChange={e=>setAvailableOnly(e.target.checked)}/> Available now</label><button type="button" className="copy-order" onClick={()=>{setMinPrice('');setMaxPrice('');setAvailableOnly(true);setSearch('');setActiveCategory('All')}}>Clear filters</button></div></div>
        <div className="product-grid" key={activeCategory+search}>
          {filtered.map((p,i)=><article className="product-card" key={p.id} style={{animationDelay:`${Math.min(i,8)*45}ms`}}>
            <button className={`product-favourite ${favourites.includes(p.id) ? 'is-favourite' : ''}`} onClick={()=>toggleFavourite(p.id)} aria-label={`${favourites.includes(p.id) ? 'Remove' : 'Add'} ${p.name} ${favourites.includes(p.id) ? 'from' : 'to'} favourites`} aria-pressed={favourites.includes(p.id)} title={favourites.includes(p.id) ? 'Remove from favourites' : 'Save to favourites'}><Heart size={17} fill={favourites.includes(p.id) ? 'currentColor' : 'none'}/><span>{favourites.includes(p.id) ? 1 : 0}</span></button>
            <button className="product-image" onClick={()=>setSelected(p)} aria-label={`View ${p.name}`}><img src={p.image} alt={p.name} loading="lazy" decoding="async" onError={e=>fallbackImage(e,p.category)}/>{(p as any).featured&&<span className="product-tag">Featured</span>}{p.tag&&<span className="product-tag">{p.tag}</span>}<span className="quick-view">QUICK LOOK <ArrowUpRight size={14}/></span></button>
            <div className="product-info"><div><span className="product-category">{p.category}</span><h3>{p.name}</h3></div><strong>{(p as any).originalPrice&&Number((p as any).originalPrice)>p.price?<><del>{formatNaira(Number((p as any).originalPrice))}</del>{formatNaira(p.price)}</>:formatNaira(p.price)}</strong></div>
            <div className="product-bottom"><span>Made to make you smile</span><button onClick={()=>add(p)} aria-label={`Add ${p.name} to cart`}><Plus size={18}/></button></div>
          </article>)}
        </div>
        {filtered.length===0&&<div className="empty-search">{activeCategory === 'Favourites' ? <>No favourites saved yet. Tap the <Heart size={15}/> on any meal to keep it here. 🍟</> : 'No cravings found. Try another search. 🍟'}</div>}
      </section>

      <section className="promo-section">
        <div className="promo-copy" data-reveal><div className="eyebrow eyebrow-light"><span className="eyebrow-line"></span> YOUR NEXT HAPPY HOUR</div><h2>THE ONLY<br/>THING BETTER<br/>THAN <em>ONE BITE?</em></h2><p>Making it a whole meal. Bring your appetite. We'll bring the flavour.</p><button className="button button-light" onClick={()=>scrollTo('menu')}>Order something good <ArrowUpRight size={17}/></button></div>
        <div className="promo-image"><img src="https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80" alt="Burger served with fries" loading="lazy" decoding="async" onError={fallbackImage}/><div className="promo-burst">HUNGRY?<br/>WE GOT<br/>YOU.</div></div>
        <div className="promo-scribble">YUM!</div>
      </section>

      <section className="promise-section">
        <div className="promise-title" data-reveal><div className="eyebrow"><span className="eyebrow-line"></span> THE EAT2SMILE WAY</div><h2>MORE THAN<br/><em>JUST A MEAL.</em></h2></div>
        <div className="promise-grid"><div data-reveal><span className="promise-icon">✳</span><h3>FRESH FEELING</h3><p>Food made with care, served with the good energy you came for.</p></div><div data-reveal><span className="promise-icon">⌁</span><h3>FLAVOUR FIRST</h3><p>Big, satisfying flavours that make every bite count.</p></div><div data-reveal><span className="promise-icon">☺</span><h3>SMILE ALWAYS</h3><p>A welcoming experience from the first hello to the last bite.</p></div></div>
      </section>

      {publicReviews.length>0&&<section className="customer-reviews"><div className="eyebrow">CUSTOMER LOVE</div><h2>REAL BITES.<br/><em>REAL REVIEWS.</em></h2><div className="customer-review-grid">{publicReviews.slice(0,6).map((r:any)=><article key={r.id}><div>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</div><h3>{r.title||'A happy customer'}</h3><p>{r.comment}</p><small>{r.displayName}</small></article>)}</div></section>}
      <section className="reviews-section" ref={quoteRef} aria-label="Snack thoughts">
        <div className="review-mark">“</div><div className="review-content" data-reveal><div className="eyebrow eyebrow-light">A LITTLE FOOD FOR THOUGHT</div><h2>SNACK TIME.<br/><em>STORY TIME.</em></h2><div className="quote-switch" key={quoteIndex}><blockquote>“{snackQuotes[quoteIndex]}”</blockquote></div><div className="quote-dots" aria-label={`Quote ${quoteIndex+1} of ${snackQuotes.length}`}>{snackQuotes.map((_,i)=><button key={i} className={quoteIndex===i?'active':''} onClick={()=>setQuoteIndex(i)} aria-label={`Show snack quote ${i+1}`}/>)}</div><small>THE EAT2SMILE SNACK THOUGHTS</small></div>
      </section>

      <section className="contact-section" id="contact">
        <div className="contact-main" data-reveal><div className="eyebrow"><span className="eyebrow-line"></span> WE'RE ALWAYS AROUND</div><h2>YOUR TABLE<br/>IS <em>CALLING.</em></h2><p>Craving something good or need a hand with an order? Reach Eat2smile any time. We're available 24 hours a day, 7 days a week.</p><div className="contact-location"><MapPin size={18}/><span><b>LOCATION</b><small>Opposite Redeemed Christian Church of God, Iddo Sarki, Abuja, FCT, Nigeria</small><a href="https://www.google.com/maps/search/?api=1&query=Eat2Smile%2C%20opposite%20Redeemed%20Christian%20Church%20of%20God%2C%20Iddo%20Sarki%2C%20Abuja%2C%20Nigeria" target="_blank" rel="noreferrer">Get directions in Google Maps <ArrowUpRight size={13}/></a></span></div><div className="contact-details">
          <a href={`mailto:${CONTACT_EMAIL}`}><Mail size={18}/><span><b>EMAIL</b><small>{CONTACT_EMAIL}</small></span></a>
          <a href="https://wa.me/2349163149653" target="_blank" rel="noreferrer"><MessageCircle size={18}/><span><b>WHATSAPP</b><small>+234 916 314 9653</small></span></a>
          <a href="tel:+2348059563897"><Phone size={18}/><span><b>TELEPHONE</b><small>+234 805 956 3897</small></span></a>
          <div><Clock3 size={18}/><span><b>WHEN WE'RE OPEN</b><small>24 hours · 7 days a week</small></span></div>
          <a href="https://www.instagram.com/koled_45/" target="_blank" rel="noreferrer"><Instagram size={18}/><span><b>INSTAGRAM</b><small>@koled_45</small></span></a>
          <a href="https://www.threads.net/@koled_45" target="_blank" rel="noreferrer"><AtSignIcon/><span><b>THREADS</b><small>@koled_45</small></span></a>
        </div></div>
        <form className="contact-card" onSubmit={sendContactMessage}><h3>DROP US A NOTE.</h3><p className="contact-email-prompt">Prefer email? <a href={`mailto:${CONTACT_EMAIL}`}>Reach us through email.</a></p><input required value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})} placeholder="Your name" aria-label="Your name" autoComplete="name"/><input required type="email" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})} placeholder="Your email address" aria-label="Your email address" autoComplete="email"/><textarea required rows={4} value={contact.message} onChange={e=>setContact({...contact,message:e.target.value})} placeholder="Tell us what's on your mind..." aria-label="Your message"></textarea><button className="button button-dark" type="submit">Open email to send <ArrowUpRight size={16}/></button>{contactSent&&<small className="form-success">Your email app should open with the message ready. Tap Send there to deliver it.</small>}</form>
      </section>
    </main>

    <footer className="footer"><div className="footer-top"><a className="brand brand-footer" href="/"><span className="brand-icon"><img src="/eat2smile-logo.png" alt="" width="38" height="38"/></span><span>EAT<span className="brand-two">2</span>SMILE<small>EVERY BITE, A SMILE.</small></span></a><p>Good food. Good mood.<br/>Every bite comes with a smile.</p><form className="newsletter-form" onSubmit={async e=>{e.preventDefault();try{const visitor=analyticsIdentity().visitorId;const d=await apiRequest('/api/notifications',{method:'POST',body:JSON.stringify({email:notificationEmail,visitor,newItems:true,promotions:true})});setNotificationMessage(d.message);setNotificationEmail('')}catch(err){setNotificationMessage(err instanceof Error?err.message:'Could not save preferences.')}}}><label htmlFor="new-item-email">Get new-item and offer updates</label><div><input id="new-item-email" type="email" required value={notificationEmail} onChange={e=>setNotificationEmail(e.target.value)} placeholder="Your email address"/><button type="submit">Notify me</button></div>{notificationMessage&&<small>{notificationMessage}</small>}</form><a className="footer-order" href="/order">LET'S EAT <ArrowUpRight size={17}/></a></div><div className="footer-bottom"><span>© 2026 EAT2SMILE. MADE WITH A LITTLE EXTRA JOY.</span><span>ABUJA, NIGERIA</span><a href="/">BACK TO TOP ↑</a></div><p className="portfolio-note">Developed by <strong>KoleDev</strong>.</p></footer>

    {toast && <div key={toast.id} className="cart-snackbar" role="status" aria-live="polite"><span className="snackbar-check"><Check size={16}/></span><span className="snackbar-message"><strong>{toast.name}</strong><small>Added to your cart</small></span><button type="button" onClick={()=>{setToast(null);if(toastTimer.current!==undefined)window.clearTimeout(toastTimer.current);setCartOpen(true)}}>View Cart <ArrowUpRight size={14}/></button><button className="snackbar-close" type="button" aria-label="Dismiss notification" onClick={()=>setToast(null)}><X size={14}/></button></div>}
    <button type="button" className={`floating-cart ${floatingCartVisible && count > 0 ? 'is-visible' : ''}`} onClick={()=>setCartOpen(true)} aria-label={`Open cart with ${count} items, total ${formatNaira(subtotal)}`} aria-hidden={!(floatingCartVisible && count > 0)} tabIndex={floatingCartVisible && count > 0 ? 0 : -1}><span className="floating-cart-icon"><ShoppingBag size={19}/><b>{count}</b></span><span className="floating-cart-copy"><small>{count} {count === 1 ? 'ITEM' : 'ITEMS'}</small><strong>{formatNaira(subtotal)}</strong></span><ArrowUpRight size={16}/></button>
    <div className="social-floats"><a className="instagram-float" href="https://www.instagram.com/koled_45/" target="_blank" rel="noreferrer" aria-label="Visit Eat2smile on Instagram"><Instagram size={21}/></a><a className="whatsapp-float" href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hello Eat2smile! I have a question about your menu.')}`} target="_blank" rel="noreferrer" aria-label="Chat with Eat2smile on WhatsApp"><MessageCircle size={22}/></a></div>

    {cartOpen&&<div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setCartOpen(false)}}><aside className="cart-drawer"><div className="drawer-head"><div><span className="eyebrow">YOUR HAPPY PLACE</span><h2>Your order <span>({count})</span></h2></div><button className="icon-button" onClick={()=>setCartOpen(false)} aria-label="Close cart"><X/></button></div>{cart.length===0?<div className="cart-empty"><span>🍔</span><h3>Your cart is feeling lonely.</h3><p>Give it something delicious to carry.</p><button className="button button-orange" onClick={()=>{setCartOpen(false);window.location.assign('/menu')}}>Explore the menu <ArrowRight size={16}/></button></div>:<><div className="cart-items">{cart.map(item=><div className="cart-item" key={item.product.id}><img src={item.product.image} alt="" loading="lazy" decoding="async" onError={fallbackImage}/><div className="cart-item-info"><b>{item.product.name}</b><small>{formatNaira(item.product.price)}</small><div className="qty-control"><button onClick={()=>changeQty(item.product.id,-1)} aria-label="Decrease quantity"><Minus size={13}/></button><span>{item.quantity}</span><button onClick={()=>changeQty(item.product.id,1)} aria-label="Increase quantity"><Plus size={13}/></button></div></div><strong>{formatNaira(item.product.price*item.quantity)}</strong><button className="remove-item" onClick={()=>remove(item.product.id)} aria-label="Remove item"><Trash2 size={15}/></button></div>)}</div><div className="cart-summary"><div><span>Subtotal</span><strong>{formatNaira(subtotal)}</strong></div><small>Delivery fee, if applicable, will be confirmed by the restaurant.</small><button className="button button-orange checkout-button" onClick={()=>{setCartOpen(false);setCheckoutOpen(true)}}>Continue to checkout <ArrowRight size={17}/></button></div></>}</aside></div>}

    {selected&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="product-modal"><button className={`modal-favourite ${favourites.includes(selected.id) ? 'is-favourite' : ''}`} onClick={()=>toggleFavourite(selected.id)} aria-label={favourites.includes(selected.id) ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={favourites.includes(selected.id)}><Heart size={18} fill={favourites.includes(selected.id) ? 'currentColor' : 'none'}/></button><button className="modal-close" onClick={()=>setSelected(null)} aria-label="Close"><X/></button><img src={selected.image} alt={selected.name} loading="lazy" decoding="async" onError={fallbackImage}/><div className="modal-copy"><span className="product-category">{selected.category}</span><h2>{selected.name}</h2><p>{selected.description}</p><div className="modal-price">{formatNaira(selected.price)}</div><button className="button button-orange" onClick={()=>{add(selected);setSelected(null);setCartOpen(true)}}>Add to my order <Plus size={17}/></button></div></div></div>}

    {accountOpen&&<div className="modal-backdrop account-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setAccountOpen(false)}}><section className="account-modal"><button className="modal-close" onClick={()=>setAccountOpen(false)} aria-label="Close order history"><X/></button><span className="eyebrow">YOUR EAT2SMILE ORDERS</span><h2>Order <em>history.</em></h2><p className="account-muted">Orders saved on this browser appear here. Keep your order access key safe when changing devices.</p>{authError&&<p className="form-error">{authError}</p>}<div className="account-heading"><h3><ClipboardList size={18}/> Previous orders</h3><button className="copy-order" onClick={()=>loadOrders().catch(e=>setAuthError(e.message))}>Refresh</button></div>{orders.length===0?<p className="account-muted">No saved orders on this browser yet.</p>:<div className="account-orders">{orders.map(order=><button key={order.id} className="account-order-row" onClick={()=>openOrder(order.id)}><span><b>{order.reference}</b><small>{new Date(order.createdAt).toLocaleString('en-NG')} · {order.orderType}</small></span><span><b>{order.status}</b><small>{formatNaira(order.total)}</small></span></button>)}</div>}<form className="track-form" onSubmit={recoverOrder}><h3>Recover an order from another device</h3><input required value={recoverForm.reference} onChange={e=>setRecoverForm({...recoverForm,reference:e.target.value.toUpperCase()})} placeholder="Order reference (ES-...)" aria-label="Order reference"/><input required type="tel" value={recoverForm.phone} onChange={e=>setRecoverForm({...recoverForm,phone:e.target.value})} placeholder="Full phone number used at checkout" aria-label="Full phone number used at checkout" autoComplete="tel"/><button className="button button-dark" type="submit">Recover order securely <ArrowRight size={15}/></button></form><form className="track-form" onSubmit={trackOrder}><h3>Track an order</h3><input required value={trackForm.reference} onChange={e=>{setTrackForm({...trackForm,reference:e.target.value.toUpperCase()});setTrackedOrder(null)}} placeholder="Order reference (ES-...)" aria-label="Order reference"/><input required type="tel" value={trackForm.phone} onChange={e=>{setTrackForm({...trackForm,phone:e.target.value});setTrackedOrder(null)}} placeholder="Full phone number used for order" aria-label="Full phone number used for order" autoComplete="tel"/><button className="button button-dark" type="submit">Track order <ArrowRight size={15}/></button>{trackedOrder&&<><p className="track-result">{trackedOrder.order.reference}: <strong>{trackedOrder.order.status}</strong> · {formatNaira(trackedOrder.order.total)}</p><div className="order-events">{trackedOrder.events.map((event:any,i:number)=><div key={i}><b>{event.status}</b><small>{new Date(event.createdAt).toLocaleString('en-NG')}{event.note?` · ${event.note}`:''}</small></div>)}</div></>}</form></section></div>}
    {orderDetail&&<div className="modal-backdrop account-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOrderDetail(null)}}><section className="account-modal"><button className="modal-close" onClick={()=>setOrderDetail(null)} aria-label="Close order"><X/></button><span className="eyebrow">ORDER DETAILS</span><h2>{orderDetail.order.reference}</h2><p className="order-status-pill">{orderDetail.order.status}</p><button className="copy-order" onClick={async()=>{if(!('Notification' in window)){setReviewMessage('Browser notifications are not supported on this device.');return}const permission=await Notification.requestPermission();if(permission==='granted'){localStorage.setItem('eat2smile-order-notifications','1');setReviewMessage('Order notifications enabled while this browser is available.')}else setReviewMessage('Notification permission was not granted.')}}>Enable order notifications</button><div className="order-detail-lines">{orderDetail.items.map((line:any,i:number)=><div key={i}><span>{line.name} × {line.quantity}</span><b>{formatNaira(line.lineTotal)}</b></div>)}</div><div className="preview-subtotal"><span>Total</span><strong>{formatNaira(orderDetail.order.total)}</strong></div>{loyaltyInfo&&<div className="loyalty-card"><h3>Your Eat2Smile rewards</h3><strong>{loyaltyInfo.points} points</strong>{loyaltyInfo.referralCode&&<p>Your referral code: <b>{loyaltyInfo.referralCode}</b> — share it with a friend. {loyaltyInfo.pointsRule}</p>}</div>}<h3>Progress</h3><div className="order-events">{orderDetail.events.map((event:any,i:number)=><div key={i}><b>{event.status}</b><small>{new Date(event.createdAt).toLocaleString('en-NG')}{event.note?` · ${event.note}`:''}</small></div>)}</div>{orderDetail.order.status==='Delivered'&&<div className="review-submit"><h3>How was your order?</h3><label>Rating <select value={reviewRating} onChange={e=>setReviewRating(Number(e.target.value))}><option value={5}>★★★★★ Excellent</option><option value={4}>★★★★☆ Good</option><option value={3}>★★★☆☆ Okay</option><option value={2}>★★☆☆☆ Poor</option><option value={1}>★☆☆☆☆ Bad</option></select></label><textarea value={reviewComment} onChange={e=>setReviewComment(e.target.value)} placeholder="Share your experience (at least 8 characters)"/><button className="copy-order" onClick={submitReview} disabled={reviewComment.trim().length<8}>Submit review</button>{reviewMessage&&<small>{reviewMessage}</small>}</div>}<button className="button button-orange checkout-button" onClick={()=>repeatOrder(orderDetail)}>Order again <ArrowRight size={16}/></button></section></div>}
    {orderSuccess&&<div className="modal-backdrop account-backdrop"><section className="account-modal order-success"><span className="success-check"><Check size={28}/></span><span className="eyebrow">ORDER RECEIVED</span><h2>Your order is <em>saved.</em></h2><p>Your order is safely saved. Keep this reference for tracking. {orderSuccess.paymentMethod==='Online'?'Payment is only confirmed after Flutterwave verification.':'The restaurant will coordinate payment with you on WhatsApp.'}</p><div className="success-reference">{orderSuccess.reference}<small>Order status: {orderSuccess.status}</small><small>Payment: {orderSuccess.paymentMethod==='Online'?'Flutterwave · '+orderSuccess.paymentStatus:'WhatsApp · '+orderSuccess.paymentStatus}</small><small>Order total: {formatNaira(orderSuccess.total)}</small></div>{paymentNotice&&<p className={paymentNotice.startsWith('Payment confirmed')?'track-result':'form-error'}>{paymentNotice}</p>}{orderSuccess.paymentMethod==='Online'?(paymentNotice.startsWith('Payment confirmed')?<p className="track-result"><Check size={16}/> Payment verified by Flutterwave.</p>:<button className="button button-orange checkout-button" onClick={()=>startOnlinePayment(orderSuccess).catch(error=>setPaymentNotice(error instanceof Error?error.message:'Unable to start payment.'))}> <ArrowRight size={16}/> Pay securely with Flutterwave</button>):<a className="button button-dark checkout-button" href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hello Eat2Smile! I have placed an order.\nOrder ID: ${orderSuccess.reference}\nName: ${customer.name}\nPhone: ${customer.phone}\nTotal: ${formatNaira(orderSuccess.total)}\nItems: ${orderSuccess.items.map(item=>`${item.name} x${item.quantity} (${formatNaira(item.lineTotal)})`).join('; ')}\nPlease confirm availability and share payment instructions.`)}`} target="_blank" rel="noreferrer"><MessageCircle size={16}/> Continue on WhatsApp</a>}<button className="button button-dark checkout-button" onClick={()=>{const id=orderSuccess.id;setOrderSuccess(null);loadOrders().then(()=>openOrder(id,orderSuccess.accessToken)).catch(()=>{})}}>View this order</button><button className="auth-switch" onClick={()=>setOrderSuccess(null)}>Continue browsing</button></section></div>}
    {checkoutOpen&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setCheckoutOpen(false)}}><div className="checkout-modal"><button className="modal-close" onClick={()=>setCheckoutOpen(false)} aria-label="Close"><X/></button><span className="eyebrow">ALMOST THERE</span><h2>Let's make it <em>delicious.</em></h2><p className="checkout-intro">No account or sign-in required. Enter your contact details so the restaurant can confirm your order.</p><div className="checkout-total"><span>{count} item(s)</span><strong>{formatNaira(Math.max(0,subtotal-couponDiscount))}</strong></div><div className="coupon-entry"><label>Discount code<input value={couponCode} onChange={e=>{setCouponCode(e.target.value.toUpperCase());setCouponDiscount(0);setCouponMessage('')}} placeholder="Enter coupon code" maxLength={32}/></label><button type="button" className="copy-order" onClick={applyCoupon} disabled={!couponCode.trim()||!customer.phone.trim()}>Apply</button>{couponMessage&&<small>{couponMessage}</small>}</div><label className="referral-entry">Friend's referral code (optional)<input value={referralCode} onChange={e=>setReferralCode(e.target.value.toUpperCase())} placeholder="E2SXXXXXXXX" maxLength={24}/></label><div className="checkout-order-preview"><b>YOUR ORDER SUMMARY</b>{cart.map(item=><div key={item.product.id}><span>{item.product.name} × {item.quantity}</span><strong>{formatNaira(item.product.price * item.quantity)}</strong></div>)}<div className="preview-subtotal"><span>Subtotal</span><strong>{formatNaira(subtotal)}</strong></div>{couponDiscount>0&&<div className="preview-subtotal"><span>Discount</span><strong>-{formatNaira(couponDiscount)}</strong></div>}<div className="preview-subtotal"><span>Estimated total</span><strong>{formatNaira(Math.max(0,subtotal-couponDiscount))}</strong></div></div><div className="order-type"><button disabled={submittingOrder} className={orderType==='Delivery'?'selected':''} onClick={()=>{setOrderType('Delivery');rotateOrderAttempt()}}><Truck size={18}/> Delivery</button><button disabled={submittingOrder} className={orderType==='Pickup'?'selected':''} onClick={()=>{setOrderType('Pickup');rotateOrderAttempt()}}><ShoppingBag size={18}/> Pickup</button></div><div className="payment-choice"><span className="checkout-label">CHOOSE HOW TO PAY</span><button type="button" disabled={submittingOrder} className={paymentMethod==='Online'?'selected':''} onClick={()=>{if(paymentMethod!=='Online')rotateOrderAttempt();setPaymentMethod('Online');setFormError('')}}><span><b>Pay online</b><small>Secure checkout powered by Flutterwave</small></span><strong>Online</strong></button><button type="button" disabled={submittingOrder} className={paymentMethod==='WhatsApp'?'selected':''} onClick={()=>{if(paymentMethod!=='WhatsApp')rotateOrderAttempt();setPaymentMethod('WhatsApp');setFormError('')}}><span><b>Pay via WhatsApp</b><small>Chat with the restaurant to arrange payment</small></span><strong>WhatsApp</strong></button></div><label>Your name<input value={customer.name} disabled={submittingOrder} onChange={e=>updateCheckoutCustomer('name',e.target.value)} placeholder="e.g. Alex Okafor"/></label><label>Phone number<input value={customer.phone} disabled={submittingOrder} onChange={e=>updateCheckoutCustomer('phone',e.target.value)} placeholder="Your active phone number" type="tel"/></label>{paymentMethod==='Online'&&<label>Email address<input type="email" autoComplete="email" required value={customer.email} disabled={submittingOrder} onChange={e=>updateCheckoutCustomer('email',e.target.value)} placeholder="For your Flutterwave receipt"/></label>}{orderType==='Delivery'&&<label>Delivery address<textarea rows={2} value={customer.address} disabled={submittingOrder} onChange={e=>updateCheckoutCustomer('address',e.target.value)} placeholder="House number, street, area, city"/></label>}<label>Special instructions (optional)<textarea rows={2} value={customer.instructions} disabled={submittingOrder} onChange={e=>updateCheckoutCustomer('instructions',e.target.value)} placeholder="Landmark, preferred contact, food notes..."/></label>{formError&&<p className="form-error">{formError}</p>}<button className="button button-orange checkout-button" disabled={submittingOrder} onClick={submitOrder}>{submittingOrder?'Saving your order…':paymentMethod==='Online'?'Place order & continue to payment':'Place order & continue on WhatsApp'} <ArrowRight size={17}/></button><div className="order-tools"><button className="copy-order" onClick={copyOrder}>{copied?<><Check size={15}/> Summary copied</>: 'Copy order text'}</button><button className="copy-order" onClick={downloadOrderImage}><Download size={14}/> Download image</button><button className="copy-order" onClick={printOrderPdf}><Printer size={14}/> Save as PDF</button></div><small className="checkout-disclaimer">Your order total is calculated by the server. Online payments are confirmed only after Flutterwave server-side verification. WhatsApp payments remain unconfirmed until the restaurant owner verifies receipt.</small></div></div>}
  </div>
}
export default App
