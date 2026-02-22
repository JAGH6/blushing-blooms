# Blushing Blooms (blushing_blooms_35)

Website for Blushing Blooms — handcrafted florals in the Oklahoma City metro (OKC, Norman, Edmond). Deploy this **folder** as its own Vercel project (Root Directory = `blushing_blooms_35`) so the site is at the **root** of your URL (e.g. `https://your-project.vercel.app/`).

## Free hosting and test URL

1. **Deploy to Vercel (free)**  
   - In Vercel: **Add New → Project** → import your GitHub repo.  
   - Set **Root Directory** to **`blushing_blooms_35`** (Edit next to Root Directory, type exactly that).  
   - Deploy. This project has only 3 serverless functions, so it stays under the Hobby 12-function limit.  
   - Vercel gives you a free URL like `your-project.vercel.app`.

2. **Your live flower site**  
   - Open: **`https://your-project.vercel.app/`** (home), **`https://your-project.vercel.app/shop`**, **`/contact`**, etc.  
   - Share that link so your wife and her partner can test (e.g. on phone and desktop).

3. **What's free**  
   - **Vercel**: Free tier is enough for this site.  
   - **Supabase**: Free tier for contact form storage (optional).  
   - **Stripe**: Test mode is free; no real charges until you go live with payments.  
   - **Calendly / Cal.com**: Free tiers available for the schedule embed.

## Optional setup (so things work end-to-end)

- **Contact form**  
  - Create a [Supabase](https://supabase.com) project (free).  
  - In Supabase SQL editor, run the contents of `supabase/blushing_blooms_35_schema.sql` (in the repo root).  
  - In Vercel → Project → Settings → Environment Variables, add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project.  
  - Redeploy. Contact form submissions will then be stored in Supabase.

- **Payments (Stripe)**  
  - Create a [Stripe](https://stripe.com) account and get **test** API keys.  
  - In Vercel, add `STRIPE_SECRET_KEY` (test key).  
  - For webhook (optional): add `STRIPE_WEBHOOK_SECRET` and point Stripe to `https://your-project.vercel.app/api/stripe-webhook`.  
  - Cart "Checkout" will then redirect to Stripe Checkout. Without keys, users can still add to cart and you can ask them to complete the order via the Contact page.

- **Schedule page**  
  - Create a free [Calendly](https://calendly.com) or [Cal.com](https://cal.com) account.  
  - Get your embed link and in `schedule.html` replace the iframe `src` with your Calendly/Cal.com embed URL.

## Updating content (no code needed)

- **Products**: Edit `data/arrangements.json` (add/change names, descriptions, prices, image URLs, `featured: true/false`).  
- **Gallery**: Edit `data/gallery.json` (image URLs, captions, link to Instagram).  
- **Site text**: Edit `data/site.json` (business name, tagline, Instagram URL, etc.).  
- **Images**: Use image URLs in the JSON (e.g. Unsplash or your own hosted images). To use files, put them in `images/` and reference as `/images/filename.jpg` in the JSON.

## Pages (when deployed with this folder as root)

| Path         | Page        |
|--------------|------------|
| `/`          | Home       |
| `/shop`      | Shop       |
| `/schedule`  | Book (Calendly/Cal.com embed) |
| `/contact`   | Contact form |
| `/gallery`   | Gallery   |
| `/thank-you` | Thank you (after checkout) |

All of this is separate from any other app in the repo; nothing here depends on or references the Tetris game.
