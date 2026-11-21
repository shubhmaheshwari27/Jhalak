# Jhalak – Virtual Saree Try-On (test app)

A mobile-first web app for testing which AI approach makes the most accurate saree try-on from one labelled photo of a folded saree.

For every saree it makes **4 images** and shows them side by side:

| | Approach A – Describe first | Approach B – Direct photo |
|---|---|---|
| **OpenAI** | AI writes a description of the saree → image model gets description + customer photo | Image model gets the saree photo + customer photo |
| **Gemini** | same | same |

You rate each image on **saree accuracy** and **face likeness** (blind mode hides which model made which). The **Compare** tab shows which option is winning.

---

## Setup (about 20 minutes, all free tiers except AI usage)

### 1. Get API keys
- **OpenAI:** https://platform.openai.com/api-keys. Add a few dollars of credit. Image models may need *organization verification* (Settings → Organization → Verify).
- **Gemini:** https://aistudio.google.com → *Get API key*. Image models need billing enabled on the Google Cloud project behind the key.

### 2. Create the Supabase database
1. Create a free project at https://supabase.com (pick the Mumbai region).
2. Open **SQL Editor → New query**, paste everything in `supabase/schema.sql` and click **Run**. This creates the tables and a private `jhalak` storage bucket.
3. Go to **Project Settings → API** and copy the **Project URL** and a **secret** key (API Keys → Secret keys; the legacy service_role key also works) (keep it secret; it only goes in Vercel).

### 3. Deploy on Vercel
1. Push this folder to a GitHub repo.
2. At https://vercel.com, click **Add New → Project** and import the repo (Framework: Next.js).
3. Under **Environment Variables**, add everything from `.env.example`:

| Name | Value |
|---|---|
| `APP_PASSCODE` | any passcode your team will type once |
| `SUPABASE_URL` | from step 2 |
| `SUPABASE_SECRET_KEY` | from step 2 |
| `OPENAI_API_KEY` | from step 1 |
| `GEMINI_API_KEY` | from step 1 |
| `OPENAI_IMAGE_MODEL` | `gpt-image-2.5-sunburst` (optional; this is the default) |
| `GEMINI_IMAGE_MODEL` | `gemini-3.1-flash-image` (optional; this is the default) |

4. Click **Deploy**, then open the link on your phone.

> Image generation takes 30–90 s. The try-on API route is set to `maxDuration = 300`, which Vercel's free plan allows when Fluid compute is on (the default for new projects). If you see timeouts, check **Project → Settings → Functions**.

### Run locally (optional)
```bash
cp .env.example .env.local   # fill in values
npm install
npm run dev                  # http://localhost:3000
```

---

## How to use it
1. **Sarees → Add saree:** photograph the saree folded on a table with label cards (BODY, TOP BORDER, BOTTOM BORDER, PALLU, BLOUSE). The AI description is generated automatically. Open the saree to check it and fix it if something is wrong.
2. **Try on:** pick sarees, take or upload a full-length photo of the person, tick consent, and choose which models and approaches to run.
3. **Session page:** images appear as they finish. Rate each one, add notes, and regenerate any that failed.
4. **Compare:** averages per option. Rate about 20 images per option before deciding.

## Changing things
- **Prompts:** `lib/server/prompts.ts` (try different drape instructions here)
- **Models/quality:** environment variables (`OPENAI_IMAGE_QUALITY=low|medium|high`, `SPEC_PROVIDER=openai|gemini`)
- **AI calls:** `lib/server/ai.ts`

## Not in this MVP (on purpose)
Kiosk mode, barcode scanning, QR hand-off, WhatsApp sharing, and automatic photo deletion. For now, delete a session manually and its photos are removed.
