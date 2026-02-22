# Blushing Blooms (blushing_blooms_35)

Website for Blushing Blooms — handcrafted florals in the Oklahoma City metro (OKC, Norman, Edmond). Served at **/flowers** on your deployment.

## Free hosting and test URL

1. **Deploy to Vercel (free)**  
   - Push this repo to GitHub and connect it at [vercel.com](https://vercel.com).  
   - Or install the [Vercel CLI](https://vercel.com/docs/cli) and run `vercel` in the project root.  
   - Vercel gives you a **free URL** like `your-project.vercel.app`. No credit card required on the free tier.

2. **Your live flower site**  
   - Open: **`https://your-project.vercel.app/flowers`**  
   - Share that link so your wife and her partner can test (e.g. on phone and desktop).

3. **What’s free**  
   - **Vercel**: Free tier is enough for this site.  
   - **Supabase**: Free tier for contact form storage (optional).  
   - **Stripe**: Test mode is free; no real charges until you go live with payments.  
   - **Calendly / Cal.com**: Free tiers available for the schedule embed.

## Optional setup (so things work end-to-end)

- **Contact form**  
  - Create a [Supabase](https://supabase.com) project (free).  
  - In Supabase SQL editor, run the contents of `supabase/blushing_blooms_35_schema.sql`.  
  - In Vercel → Project → Settings → Environment Variables, add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project.  
  - Redeploy. Contact form submissions will then be stored in Supabase.

- **Payments (Stripe)**  
  - Create a [Stripe](https://stripe.com) account and get **test** API keys.  
  - In Vercel, add `STRIPE_SECRET_KEY` (test key).  
  - For webhook (optional): add `STRIPE_WEBHOOK_SECRET` and point Stripe to `https://your-project.vercel.app/api/blushing_blooms_35/stripe-webhook`.  
  - Cart “Checkout” will then redirect to Stripe Checkout. Without keys, users can still add to cart and you can ask them to complete the order via the Contact page.

- **Schedule page**  
  - Create a free [Calendly](https://calendly.com) or [Cal.com](https://cal.com) account.  
  - Get your embed link and in `blushing_blooms_35/schedule.html` replace the iframe `src` with your Calendly/Cal.com embed URL.

## Updating content (no code needed)

- **Products**: Edit `blushing_blooms_35/data/arrangements.json` (add/change names, descriptions, prices, image URLs, `featured: true/false`).  
- **Gallery**: Edit `blushing_blooms_35/data/gallery.json` (image URLs, captions, link to Instagram).  
- **Site text**: Edit `blushing_blooms_35/data/site.json` (business name, tagline, Instagram URL, etc.).  
- **Images**: Use image URLs in the JSON (e.g. Unsplash or your own hosted images). To use files, put them in `blushing_blooms_35/images/` and reference as `/flowers/images/filename.jpg` in the JSON.

## Pages

| Path            | Page        |
|-----------------|------------|
| `/flowers`      | Home       |
| `/flowers/shop` | Shop       |
| `/flowers/schedule` | Book (Calendly/Cal.com embed) |
| `/flowers/contact` | Contact form |
| `/flowers/gallery`  | Gallery   |
| `/flowers/thank-you` | Thank you (after checkout) |

All of this is separate from any other app in this repo; nothing here depends on or references the Tetris game.
