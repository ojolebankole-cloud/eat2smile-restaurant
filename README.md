# Eat2smile Website

A responsive restaurant ordering website developed by KoleDev.

## Version 1.2.0
- Added a clear next-section arrow to the hero screen for guided home-page navigation.
- Updated the restaurant contact details and working links: email, WhatsApp, telephone, Instagram and Threads.
- Updated service availability to 24/7.
- Replaced the portfolio-fictional-concept footer copy with a KoleDev developer credit.
- Rebuilt the note form to prepare a real email in the visitor’s email app addressed to davidajulo4@gmail.com. The visitor must press Send in that app.
- Expanded checkout with customer details, delivery/pickup selection, optional instructions, input validation, an order reference and a WhatsApp order handoff to +2349163149653.
- Added rotating long-form snack quotes. Rotation pauses while the quote section is visible so visitors can read, and resumes while it is off-screen. Visitors can also select a quote manually.
- Preserved the existing menu, cart, local cart persistence, responsive layout, animations and image fallback.

## Run in Termux
Keep the project inside Termux private storage, not `/storage/emulated/0/Download`, because npm needs to create symbolic links.

```bash
cd ~/Eat2smile-v1.2.0/Eat2smile
npm install
npm run build
npm run dev -- --host 0.0.0.0
```

Open `http://localhost:5173` in your phone browser. Keep Termux running while testing. Stop the server with `CTRL + C`.

## Live contact details configured
- Email: davidajulo4@gmail.com
- WhatsApp: +234 916 314 9653
- Telephone: +234 805 956 3897
- Instagram: @koled_45
- Threads: @koled_45
- Availability: 24 hours a day, 7 days a week

## Important operational notes
- The contact form uses a `mailto:` handoff. It opens the visitor’s configured email app with the message addressed to Eat2smile. It does not silently send email; the visitor must press Send. A server-side form service would be needed for direct website submission.
- Checkout opens WhatsApp with the order details. The visitor must press Send, and the order is not confirmed until Eat2smile replies. No payment is taken by the website. Delivery fees, item availability, preparation time and payment instructions are confirmed by the restaurant.
- Food photography uses remote Unsplash images and requires internet access. Failed images use the bundled fallback illustration.
- No street address or delivery fee has been invented.

## Verification
Run `npm run build` after installing dependencies. A successful build verifies TypeScript compilation and production bundling. Test the WhatsApp and email handoffs on a device with WhatsApp and an email app configured before publishing.

## Version 1.4.0 checkout updates
- Checkout shows an itemised summary and subtotal before the customer sends the order.
- **Copy order text** copies the same reference and item details.
- **Download image** creates a PNG receipt locally in the browser.
- **Save as PDF** opens a print-ready receipt; choose **Save as PDF** in the browser/system print dialog.
- **Continue to WhatsApp** navigates to the Eat2smile WhatsApp number with the full order request prefilled. The customer must still tap Send in WhatsApp. The order remains unconfirmed until Eat2smile replies.
- Floating Instagram and WhatsApp shortcuts are available on every page.

No order is sent to a server, and no payment is processed by this frontend. Delivery fee and payment instructions are confirmed directly by Eat2smile.


## Version 1.4.0 changes
- The hero food feature is now a four-image swipe gallery. Swipe left/right on the image, use the arrow buttons, or tap a dot.
- Removed the fake `SCROLL TO GET HUNGRY` progress dash and `01 / 04` counter.
- Removed the illustrated SVG food fallback. Failed menu photos use category-matched Unsplash photography instead.
- Removed the explanatory paragraph directly below the Drop Us a Note heading.
- All photography is remote Unsplash content and needs an internet connection.


## Version 1.5 update
- Added a direct “Reach us through email” mailto link in the Drop Us a Note card.
- The green confirmation note remains conditional and appears only after the visitor submits the note form using “Open email to send”.
- Added directional image transitions, circular reveal, soft blur-to-sharp entrance, caption stagger, halo accent and responsive controls to the four-slide hero gallery.
- Respects `prefers-reduced-motion`.
