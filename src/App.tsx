import { useEffect, useMemo, useRef, useState, type SyntheticEvent, type FormEvent } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Clock3, Instagram, Mail, MapPin, Menu, Minus, Phone, Plus, Search, ShoppingBag, Sparkles, Trash2, X, MessageCircle, Utensils, Truck, Download, Printer } from 'lucide-react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { categories, formatNaira, products, WHATSAPP_NUMBER, type Product } from './data'

gsap.registerPlugin(ScrollTrigger)

type CartItem = { product: Product; quantity: number }
const CONTACT_EMAIL = 'davidajulo4@gmail.com'
const snackQuotes = [
  'A good snack is never just a snack. It is the little plot twist in a long day, the crispy pause between responsibilities, and the tiny celebration you did not know you needed. One bite can turn the mood around, but a box to share can turn an ordinary evening into a proper memory.',
  'Some people journal, some people take long walks, and some of us hear the unmistakable call of golden fries. There is no shame in answering that call. Let the crunch be loud, the sauce be generous, and the moment be yours. Happiness sometimes arrives in a paper pack with extra napkins.',
  'The perfect snack understands timing. It shows up when the group chat is active, when the film reaches the good part, when the rain starts tapping the window, or when you simply deserve something lovely. Keep the conversation flowing, pass the plate around, and never underestimate the power of one more bite.',
  'A burger in one hand and a milkshake in the other is a very convincing argument for slowing down. Let the world wait a minute. Enjoy the warm bite, the cool sip, the familiar flavour, and the small joy of having exactly what you were craving. You can return to being productive after the last crumb.'
]
const readCart = (): CartItem[] => {
  try { return JSON.parse(localStorage.getItem('eat2smile-cart') || '[]') } catch { return [] }
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
  image.src = `https://images.unsplash.com/${unsplashFallbacks[category] || unsplashFallbacks.default}?auto=format&fit=crop&w=1000&q=85`
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
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [orderType, setOrderType] = useState<'Delivery'|'Pickup'>('Delivery')
  const [customer, setCustomer] = useState({name:'', phone:'', address:'', instructions:''})
  const [formError, setFormError] = useState('')
  const [copied, setCopied] = useState(false)
  const [orderReference] = useState(() => `ES-${Date.now().toString(36).toUpperCase()}`)
  const [contactSent, setContactSent] = useState(false)
  const [contact, setContact] = useState({name:'', email:'', message:''})
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [heroSlide, setHeroSlide] = useState(0)
  const heroTouchStart = useRef<number | null>(null)
  const heroDirection = useRef(1)
  const changeHeroSlide = (direction: number) => {
    heroDirection.current = direction
    setHeroSlide(current => (current + direction + heroSlides.length) % heroSlides.length)
  }
  const heroRef = useRef<HTMLElement>(null)
  const quoteRef = useRef<HTMLElement>(null)
  const introRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLElement>(null)

  useEffect(() => { localStorage.setItem('eat2smile-cart', JSON.stringify(cart)) }, [cart])
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

  const filtered = useMemo(() => products.filter(p => (activeCategory==='All' || p.category===activeCategory) && (p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()))), [activeCategory, search])
  const count = cart.reduce((sum,item)=>sum+item.quantity,0)
  const subtotal = cart.reduce((sum,item)=>sum+item.product.price*item.quantity,0)

  const add = (product:Product) => setCart(old => {
    const found = old.find(i=>i.product.id===product.id)
    return found ? old.map(i=>i.product.id===product.id?{...i,quantity:i.quantity+1}:i) : [...old,{product,quantity:1}]
  })
  const changeQty = (id:string, delta:number) => setCart(old => old.map(i=>i.product.id===id?{...i,quantity:i.quantity+delta}:i).filter(i=>i.quantity>0))
  const remove = (id:string) => setCart(old=>old.filter(i=>i.product.id!==id))
  const scrollTo = (id:string) => { setMobileOpen(false); document.getElementById(id)?.scrollIntoView({behavior:'smooth'}) }

  const orderText = () => {
    const reference = orderReference
    const lines = cart.map(i=>`• ${i.product.name} x${i.quantity} — ${formatNaira(i.product.price*i.quantity)}`).join('\n')
    return `EAT2SMILE ORDER REQUEST\nReference: ${reference}\n\n${lines}\n\nSubtotal: ${formatNaira(subtotal)}\nOrder type: ${orderType}\nCustomer: ${customer.name}\nCustomer phone: ${customer.phone}${orderType==='Delivery'?`\nDelivery address: ${customer.address}`:''}${customer.instructions.trim()?`\nOrder instructions: ${customer.instructions.trim()}`:''}\n\nPlease confirm item availability, delivery fee (if applicable), estimated preparation/delivery time and payment instructions. This order is not confirmed until Eat2smile replies. Thank you!`
  }
  const submitOrder = () => {
    if (!cart.length) { setFormError('Your cart is empty. Add something delicious before checkout.'); return }
    if (!customer.name.trim() || !customer.phone.trim() || (orderType==='Delivery' && !customer.address.trim())) {
      setFormError('Please complete your name, active phone number and delivery address where required.'); return
    }
    const digits = customer.phone.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 15) { setFormError('Enter a valid phone number with at least 10 digits.'); return }
    setFormError('')
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderText())}`
    // Navigate directly so mobile browsers hand off to WhatsApp with the full order prefilled.
    window.location.href = url
  }
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
      'EAT2SMILE  |  ORDER SUMMARY', `Reference: ${orderReference}`, `Date: ${new Date().toLocaleString('en-NG')}`, '',
      ...cart.map(item => `${item.product.name}  x${item.quantity}     ${formatNaira(item.product.price * item.quantity)}`), '',
      `Subtotal: ${formatNaira(subtotal)}`, `Order type: ${orderType}`, `Customer: ${customer.name || 'Not provided'}`,
      `Phone: ${customer.phone || 'Not provided'}`, ...(orderType === 'Delivery' ? [`Address: ${customer.address || 'Not provided'}`] : []),
      ...(customer.instructions.trim() ? [`Note: ${customer.instructions.trim()}`] : []), '',
      'This is an order request, not a confirmed order.', 'Eat2smile will confirm availability, delivery fee and payment details on WhatsApp.'
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
    popup.document.write(`<!doctype html><html><head><title>Eat2smile ${orderReference}</title><style>body{font:15px Arial,sans-serif;color:#1c1c1c;padding:36px;max-width:760px;margin:auto}h1{color:#ff6b00}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{text-align:left;padding:12px;border-bottom:1px solid #eee} .total{font-size:22px;font-weight:bold;color:#ff6b00}.muted{color:#777;line-height:1.6}@media print{button{display:none}}</style></head><body><h1>EAT2SMILE</h1><h2>Order summary</h2><p>Reference: ${orderReference}<br>Date: ${new Date().toLocaleString('en-NG')}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><p class="total">Subtotal: ${formatNaira(subtotal)}</p><p>Order type: ${orderType}<br>Customer: ${escapeHtml(customer.name || 'Not provided')}<br>Phone: ${escapeHtml(customer.phone || 'Not provided')}${orderType === 'Delivery' ? `<br>Address: ${escapeHtml(customer.address || 'Not provided')}` : ''}${customer.instructions.trim() ? `<br>Instructions: ${escapeHtml(customer.instructions.trim())}` : ''}</p><p class="muted">This is an order request, not a confirmed order. Eat2smile will confirm availability, delivery fee and payment details on WhatsApp.</p><button onclick="window.print()">Print / Save as PDF</button><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`)
    popup.document.close()
  }

  return <div className="site-shell">
    <div className="intro-overlay" ref={introRef} aria-hidden="true"><div className="loader-mark"><Utensils size={28}/></div><div className="loader-name"><span className="loader-word">EAT</span><span className="loader-word loader-orange">2</span><span className="loader-word">SMILE</span></div><small>GOOD FOOD IS ON THE WAY</small><div className="loader-progress"><span /></div></div>
    <div className="announcement"><span><Sparkles size={13}/> BIG CRAVINGS. BIGGER SMILES.</span><span>Freshly made in Abuja <span className="announcement-dot">•</span> Order your favourites today</span></div>
    <header className="header">
      <a className="brand" href="#home" onClick={e=>{e.preventDefault();scrollTo('home')}}><span className="brand-icon"><Utensils size={19}/></span><span>EAT<span className="brand-two">2</span>SMILE<small>EVERY BITE, A SMILE.</small></span></a>
      <nav className="desktop-nav"><a href="#home">Home</a><a href="#menu">Our menu</a><a href="#story">Our story</a><a href="#contact">Find us</a></nav>
      <div className="header-actions"><button className="search-trigger" onClick={()=>scrollTo('menu')} aria-label="Search menu"><Search size={19}/></button><button className="cart-trigger" onClick={()=>setCartOpen(true)}><ShoppingBag size={17}/> <span>My order</span><b>{count}</b></button><button className="mobile-menu-button" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">{mobileOpen?<X/>:<Menu/>}</button></div>
    </header>
    {mobileOpen && <div className="mobile-nav"><a onClick={()=>scrollTo('home')}>Home</a><a onClick={()=>scrollTo('menu')}>Our menu</a><a onClick={()=>scrollTo('story')}>Our story</a><a onClick={()=>scrollTo('contact')}>Find us</a></div>}

    <main>
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
            <img key={heroSlide} data-direction={heroDirection.current} className="hero-food" src={`https://images.unsplash.com/${heroSlides[heroSlide].image}?auto=format&fit=crop&w=1100&q=90`} alt={heroSlides[heroSlide].alt} onError={e=>fallbackImage(e,'Burgers')}/>
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

      <section className="story-section" id="story">
        <div className="story-copy" data-reveal><div className="eyebrow"><span className="eyebrow-line"></span> A LITTLE ABOUT US</div><h2>HAPPINESS<br/>IS <em>HOMEMADE.</em></h2><p>At Eat2smile, we believe good food has a way of making an ordinary day feel special. From the first crunch to the last bite, we're here for flavour, freshness and the joy of eating well.</p><button className="button button-orange" onClick={()=>scrollTo('menu')}>Find your happy bite <ArrowRight size={17}/></button></div>
        <div className="story-visual" data-reveal><div className="story-orbit"></div><img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1000&q=85" alt="A table filled with delicious food" onError={fallbackImage}/><div className="story-note"><span>THE SECRET INGREDIENT?</span><strong>A WHOLE LOT<br/>OF LOVE.</strong><b>☺</b></div></div>
      </section>

      <section className="menu-section" id="menu" ref={menuRef}>
        <div className="section-heading" data-reveal><div><div className="eyebrow"><span className="eyebrow-line"></span> THE GOOD STUFF</div><h2>MEET YOUR<br/><em>NEW CRAVING.</em></h2></div><p>Big bites, bold flavours and something for every kind of hungry. Go on, find your favourite.</p></div>
        <div className="menu-toolbar"><div className="category-tabs">{categories.map(cat=><button key={cat} className={activeCategory===cat?'active':''} onClick={()=>setActiveCategory(cat)}>{cat}</button>)}</div><label className="menu-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a craving..." /></label></div>
        <div className="product-grid" key={activeCategory+search}>
          {filtered.map((p,i)=><article className="product-card" key={p.id} style={{animationDelay:`${Math.min(i,8)*45}ms`}}>
            <button className="product-image" onClick={()=>setSelected(p)} aria-label={`View ${p.name}`}><img src={p.image} alt={p.name} loading="lazy" onError={e=>fallbackImage(e,p.category)}/>{p.tag&&<span className="product-tag">{p.tag}</span>}<span className="quick-view">QUICK LOOK <ArrowUpRight size={14}/></span></button>
            <div className="product-info"><div><span className="product-category">{p.category}</span><h3>{p.name}</h3></div><strong>{formatNaira(p.price)}</strong></div>
            <div className="product-bottom"><span>Made to make you smile</span><button onClick={()=>add(p)} aria-label={`Add ${p.name} to cart`}><Plus size={18}/></button></div>
          </article>)}
        </div>
        {filtered.length===0&&<div className="empty-search">No cravings found. Try another search. 🍟</div>}
      </section>

      <section className="promo-section">
        <div className="promo-copy" data-reveal><div className="eyebrow eyebrow-light"><span className="eyebrow-line"></span> YOUR NEXT HAPPY HOUR</div><h2>THE ONLY<br/>THING BETTER<br/>THAN <em>ONE BITE?</em></h2><p>Making it a whole meal. Bring your appetite. We'll bring the flavour.</p><button className="button button-light" onClick={()=>scrollTo('menu')}>Order something good <ArrowUpRight size={17}/></button></div>
        <div className="promo-image"><img src="https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=85" alt="Delicious burger and fries" onError={fallbackImage}/><div className="promo-burst">HUNGRY?<br/>WE GOT<br/>YOU.</div></div>
        <div className="promo-scribble">YUM!</div>
      </section>

      <section className="promise-section">
        <div className="promise-title" data-reveal><div className="eyebrow"><span className="eyebrow-line"></span> THE EAT2SMILE WAY</div><h2>MORE THAN<br/><em>JUST A MEAL.</em></h2></div>
        <div className="promise-grid"><div data-reveal><span className="promise-icon">✳</span><h3>FRESH FEELING</h3><p>Food made with care, served with the good energy you came for.</p></div><div data-reveal><span className="promise-icon">⌁</span><h3>FLAVOUR FIRST</h3><p>Big, satisfying flavours that make every bite count.</p></div><div data-reveal><span className="promise-icon">☺</span><h3>SMILE ALWAYS</h3><p>A welcoming experience from the first hello to the last bite.</p></div></div>
      </section>

      <section className="reviews-section" ref={quoteRef} aria-label="Snack thoughts">
        <div className="review-mark">“</div><div className="review-content" data-reveal><div className="eyebrow eyebrow-light">A LITTLE FOOD FOR THOUGHT</div><h2>SNACK TIME.<br/><em>STORY TIME.</em></h2><div className="quote-switch" key={quoteIndex}><blockquote>“{snackQuotes[quoteIndex]}”</blockquote></div><div className="quote-dots" aria-label={`Quote ${quoteIndex+1} of ${snackQuotes.length}`}>{snackQuotes.map((_,i)=><button key={i} className={quoteIndex===i?'active':''} onClick={()=>setQuoteIndex(i)} aria-label={`Show snack quote ${i+1}`}/>)}</div><small>THE EAT2SMILE SNACK THOUGHTS</small></div>
      </section>

      <section className="contact-section" id="contact">
        <div className="contact-main" data-reveal><div className="eyebrow"><span className="eyebrow-line"></span> WE'RE ALWAYS AROUND</div><h2>YOUR TABLE<br/>IS <em>CALLING.</em></h2><p>Craving something good or need a hand with an order? Reach Eat2smile any time. We're available 24 hours a day, 7 days a week.</p><div className="contact-details">
          <a href={`mailto:${CONTACT_EMAIL}`}><Mail size={18}/><span><b>EMAIL</b><small>{CONTACT_EMAIL}</small></span></a>
          <a href="https://wa.me/2349163149653" target="_blank" rel="noreferrer"><MessageCircle size={18}/><span><b>WHATSAPP</b><small>+234 916 314 9653</small></span></a>
          <a href="tel:+2348059563897"><Phone size={18}/><span><b>TELEPHONE</b><small>+234 805 956 3897</small></span></a>
          <div><Clock3 size={18}/><span><b>WHEN WE'RE OPEN</b><small>24 hours · 7 days a week</small></span></div>
          <a href="https://www.instagram.com/koled_45/" target="_blank" rel="noreferrer"><Instagram size={18}/><span><b>INSTAGRAM</b><small>@koled_45</small></span></a>
          <a href="https://www.threads.net/@koled_45" target="_blank" rel="noreferrer"><AtSignIcon/><span><b>THREADS</b><small>@koled_45</small></span></a>
        </div></div>
        <form className="contact-card" onSubmit={sendContactMessage}><h3>DROP US A NOTE.</h3><p className="contact-email-prompt">Prefer email? <a href={`mailto:${CONTACT_EMAIL}`}>Reach us through email.</a></p><input required value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})} placeholder="Your name"/><input required type="email" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})} placeholder="Your email address"/><textarea required rows={4} value={contact.message} onChange={e=>setContact({...contact,message:e.target.value})} placeholder="Tell us what's on your mind..."></textarea><button className="button button-dark" type="submit">Open email to send <ArrowUpRight size={16}/></button>{contactSent&&<small className="form-success">Your email app should open with the message ready. Tap Send there to deliver it.</small>}</form>
      </section>
    </main>

    <footer className="footer"><div className="footer-top"><a className="brand brand-footer" href="#home"><span className="brand-icon"><Utensils size={19}/></span><span>EAT<span className="brand-two">2</span>SMILE<small>EVERY BITE, A SMILE.</small></span></a><p>Good food. Good mood.<br/>Every bite comes with a smile.</p><a className="footer-order" href="#menu">LET'S EAT <ArrowUpRight size={17}/></a></div><div className="footer-bottom"><span>© 2026 EAT2SMILE. MADE WITH A LITTLE EXTRA JOY.</span><span>ABUJA, NIGERIA</span><a href="#home">BACK TO TOP ↑</a></div><p className="portfolio-note">Developed by <strong>KoleDev</strong>.</p></footer>

    <div className="social-floats"><a className="instagram-float" href="https://www.instagram.com/koled_45/" target="_blank" rel="noreferrer" aria-label="Visit Eat2smile on Instagram"><Instagram size={21}/></a><a className="whatsapp-float" href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hello Eat2smile! I have a question about your menu.')}`} target="_blank" rel="noreferrer" aria-label="Chat with Eat2smile on WhatsApp"><MessageCircle size={22}/></a></div>

    {cartOpen&&<div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setCartOpen(false)}}><aside className="cart-drawer"><div className="drawer-head"><div><span className="eyebrow">YOUR HAPPY PLACE</span><h2>Your order <span>({count})</span></h2></div><button className="icon-button" onClick={()=>setCartOpen(false)} aria-label="Close cart"><X/></button></div>{cart.length===0?<div className="cart-empty"><span>🍔</span><h3>Your cart is feeling lonely.</h3><p>Give it something delicious to carry.</p><button className="button button-orange" onClick={()=>{setCartOpen(false);scrollTo('menu')}}>Explore the menu <ArrowRight size={16}/></button></div>:<><div className="cart-items">{cart.map(item=><div className="cart-item" key={item.product.id}><img src={item.product.image} alt="" onError={fallbackImage}/><div className="cart-item-info"><b>{item.product.name}</b><small>{formatNaira(item.product.price)}</small><div className="qty-control"><button onClick={()=>changeQty(item.product.id,-1)} aria-label="Decrease quantity"><Minus size={13}/></button><span>{item.quantity}</span><button onClick={()=>changeQty(item.product.id,1)} aria-label="Increase quantity"><Plus size={13}/></button></div></div><strong>{formatNaira(item.product.price*item.quantity)}</strong><button className="remove-item" onClick={()=>remove(item.product.id)} aria-label="Remove item"><Trash2 size={15}/></button></div>)}</div><div className="cart-summary"><div><span>Subtotal</span><strong>{formatNaira(subtotal)}</strong></div><small>Delivery fee, if applicable, will be confirmed on WhatsApp.</small><button className="button button-orange checkout-button" onClick={()=>{setCartOpen(false);setCheckoutOpen(true)}}>Continue to checkout <ArrowRight size={17}/></button></div></>}</aside></div>}

    {selected&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="product-modal"><button className="modal-close" onClick={()=>setSelected(null)} aria-label="Close"><X/></button><img src={selected.image} alt={selected.name} onError={fallbackImage}/><div className="modal-copy"><span className="product-category">{selected.category}</span><h2>{selected.name}</h2><p>{selected.description}</p><div className="modal-price">{formatNaira(selected.price)}</div><button className="button button-orange" onClick={()=>{add(selected);setSelected(null);setCartOpen(true)}}>Add to my order <Plus size={17}/></button></div></div></div>}

    {checkoutOpen&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setCheckoutOpen(false)}}><div className="checkout-modal"><button className="modal-close" onClick={()=>setCheckoutOpen(false)} aria-label="Close"><X/></button><span className="eyebrow">ALMOST THERE</span><h2>Let's make it <em>delicious.</em></h2><p className="checkout-intro">Your order summary will open in WhatsApp so the team can confirm it with you.</p><div className="checkout-total"><span>{count} item(s)</span><strong>{formatNaira(subtotal)}</strong></div><div className="checkout-order-preview"><b>YOUR ORDER SUMMARY</b>{cart.map(item=><div key={item.product.id}><span>{item.product.name} × {item.quantity}</span><strong>{formatNaira(item.product.price * item.quantity)}</strong></div>)}<div className="preview-subtotal"><span>Subtotal</span><strong>{formatNaira(subtotal)}</strong></div></div><div className="order-type"><button className={orderType==='Delivery'?'selected':''} onClick={()=>setOrderType('Delivery')}><Truck size={18}/> Delivery</button><button className={orderType==='Pickup'?'selected':''} onClick={()=>setOrderType('Pickup')}><ShoppingBag size={18}/> Pickup</button></div><label>Your name<input value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})} placeholder="e.g. Alex Okafor"/></label><label>Phone number<input value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})} placeholder="Your active phone number" type="tel"/></label>{orderType==='Delivery'&&<label>Delivery address<textarea rows={2} value={customer.address} onChange={e=>setCustomer({...customer,address:e.target.value})} placeholder="House number, street, area, city"/></label>}<label>Special instructions (optional)<textarea rows={2} value={customer.instructions} onChange={e=>setCustomer({...customer,instructions:e.target.value})} placeholder="Landmark, preferred contact, food notes..."/></label>{formError&&<p className="form-error">{formError}</p>}<button className="button button-orange checkout-button" onClick={submitOrder}>Send order to Eat2smile <ArrowUpRight size={17}/></button><div className="order-tools"><button className="copy-order" onClick={copyOrder}>{copied?<><Check size={15}/> Summary copied</>: 'Copy order text'}</button><button className="copy-order" onClick={downloadOrderImage}><Download size={14}/> Download image</button><button className="copy-order" onClick={printOrderPdf}><Printer size={14}/> Save as PDF</button></div><small className="checkout-disclaimer">Your order is sent to Eat2smile on WhatsApp. Tap Send in WhatsApp, then wait for the team to confirm availability, delivery fee and payment instructions. No payment is collected on this website.</small></div></div>}
  </div>
}
export default App
