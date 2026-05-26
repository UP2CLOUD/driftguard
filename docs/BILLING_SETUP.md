# Stripe Billing Setup

Complete guide to enable the payment flow for `#pricing` CTAs on the landing page.

---

## Architecture

```
User clicks "Start free trial" (Team plan) on /#pricing
   │
   ├─ signed out  → /auth/signin?callbackUrl=/dashboard?intent=upgrade-team
   │                  └─ GitHub OAuth → dashboard → UpgradeIntent fires → checkout
   │
   └─ signed in   → POST /api/billing/checkout (Next.js Route Handler)
                       │
                       └─ POST {API}/api/v1/billing/checkout (FastAPI)
                            ├─ get_or_create_customer  → Stripe Customer
                            └─ create_checkout_session → Stripe Checkout Session
                                 └─ returns { url } → window.location.href = url

After payment:
   Stripe → success_url = /dashboard?checkout=success
   Stripe → webhook POST /api/v1/webhooks/stripe
              └─ apply_subscription_event → org.plan = "team"
```

---

## Prerequisites

1. **Stripe account** (https://dashboard.stripe.com) — start with Test mode
2. **Domain configured for Stripe** — production needs a verified domain
3. **DriftGuard API publicly reachable** — Stripe must POST webhooks to it
   (use ngrok or a public Cloud Run URL during dev)

---

## Step 1 — Create Stripe products and prices

Stripe Dashboard → **Products** → **+ Add product**:

### Product 1: DriftGuard Team
- Name: `DriftGuard Team`
- Description: `Per-repo billing for engineering teams`
- Pricing model: `Standard pricing`
- Price: `€29.00 EUR` / month, recurring
- Optional: add an annual price of `€276/year` (€23/mo equivalent)

**Copy the Price ID** (format: `price_1AbC2DeFgHi3JkL4MnO5PqR6`). Used as `STRIPE_PRICE_TEAM`.

### Product 2: DriftGuard Pro (optional, future tier)
Same structure. Copy the Price ID for `STRIPE_PRICE_PRO`.

---

## Step 2 — Configure webhook endpoint

Stripe Dashboard → **Developers** → **Webhooks** → **+ Add endpoint**:

- **Endpoint URL:** `https://api.driftguard.io/api/v1/webhooks/stripe`
  (or your ngrok URL during dev, e.g. `https://abc123.ngrok.app/api/v1/webhooks/stripe`)
- **Events to send:**
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `checkout.session.completed`
  - `invoice.payment_failed`

After saving, click **Reveal** under "Signing secret" and copy `whsec_...`. Used as `STRIPE_WEBHOOK_SECRET`.

---

## Step 3 — Get API keys

Stripe Dashboard → **Developers** → **API keys** → copy the **Secret key** (`sk_test_...` or `sk_live_...`). Used as `STRIPE_API_KEY`.

---

## Step 4 — Configure DriftGuard API env

Set on the API service (Cloud Run, container, .env):

```bash
# Required
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_TEAM=price_...
STRIPE_PRICE_PRO=price_...           # optional

# Public URL used in checkout success/cancel callbacks
PUBLIC_BASE_URL=https://driftguard-blue.vercel.app
```

For local docker-compose, copy to `.env`:

```bash
cp .env.example .env
# Edit the Stripe values
docker compose restart api
```

---

## Step 5 — Configure web app env

On Vercel → Project → Settings → Environment Variables:

- `NEXT_PUBLIC_API_URL` — already set to your API URL
- `SECRET_KEY` — must match the API's `SECRET_KEY` (internal auth between Next.js routes and FastAPI)

The web app **does not need any Stripe keys** — all billing flows are proxied through the FastAPI API.

---

## Step 6 — Test the flow

### Local test with Stripe CLI

```bash
# Install: https://docs.stripe.com/stripe-cli
stripe login

# Forward webhooks to local API
stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe

# Copy the displayed whsec_... → STRIPE_WEBHOOK_SECRET in .env
docker compose restart api
```

In another terminal:

```bash
stripe trigger checkout.session.completed
docker compose logs -f api | grep stripe   # expect: plan_updated ... plan=team
```

### Browser test

1. Open `https://driftguard-blue.vercel.app/#pricing`
2. Click **"Start free trial →"** under the Team plan
3. Signed out? → GitHub OAuth flow → dashboard → auto-redirected to Stripe Checkout
4. Use test card `4242 4242 4242 4242`, any future expiry, any 3-digit CVC
5. Complete payment → redirected to `/dashboard?checkout=success`
6. Verify org plan upgraded:
   ```bash
   docker compose exec api uv run python -c "
   import asyncio
   from sqlalchemy import select
   from driftguard.core.db import AsyncSessionLocal
   from driftguard.db.models import Organization
   async def main():
       async with AsyncSessionLocal() as db:
           r = await db.execute(select(Organization))
           for o in r.scalars(): print(o.id, o.plan, o.stripe_customer_id)
   asyncio.run(main())
   "
   ```

---

## Step 7 — Production checklist

- [ ] Switch Stripe to **Live mode** (toggle in dashboard header)
- [ ] Recreate products + prices in Live mode (they don't transfer from Test)
- [ ] Recreate the webhook endpoint in Live mode → new `whsec_` secret
- [ ] Update API env vars with **live** keys (`sk_live_...`, new `whsec_...`, live `price_...`)
- [ ] Configure tax registrations in Stripe → Tax (EU IOSS, UK, US states you sell to)
- [ ] Enable [Stripe Radar](https://stripe.com/radar) — included with Standard pricing
- [ ] Customize the Customer Portal (Settings → Customer portal):
  - Update payment method: ✓
  - View invoice history: ✓
  - Cancel subscriptions: ✓ (end-of-period recommended)

---

## Customer portal (cancellations + payment method updates)

Already wired via `/api/billing/portal` and the dashboard's `BillingActions` component.

1. Stripe Dashboard → **Settings** → **Customer portal**
2. Activate the portal, configure allowed actions
3. Done — `BillingActions` calls `/api/billing/portal` → redirects user

---

## Troubleshooting

| Error | Likely cause | Fix |
|---|---|---|
| `Billing is not yet enabled. Contact sales@driftguard.io.` | API returned 503 | `STRIPE_API_KEY` not set on API service |
| `Unknown plan: team` | `STRIPE_PRICE_TEAM` missing | Set the env var to the actual Price ID from Stripe |
| Webhook signature fails | `STRIPE_WEBHOOK_SECRET` mismatch | Re-copy from Stripe Dashboard → Webhooks → endpoint. `stripe listen` rotates secret per session |
| Subscription created but `org.plan` still `free` | Webhook didn't reach API, or org lookup failed | Check `Webhook attempts` in Stripe; check `org.stripe_customer_id` is set; check API logs for `stripe_event_no_org` |
| Checkout opens but immediately fails | `success_url`/`cancel_url` invalid | Set `PUBLIC_BASE_URL` to a valid HTTPS URL in production |
| "Could not resolve installation" | User has no GitHub App installation | Send through `/api/v1/orgs/by-installation/{id}` first; ensure install flow runs |

---

## Related code

| File | Purpose |
|---|---|
| `apps/api/driftguard/services/billing.py`    | Core Stripe service (customer, checkout, portal, webhook verify) |
| `apps/api/driftguard/api/v1/billing.py`      | API endpoints `POST /api/v1/billing/{checkout,portal}` |
| `apps/api/driftguard/api/v1/stripe_webhooks.py` | Webhook receiver `POST /api/v1/webhooks/stripe` |
| `apps/web/app/api/billing/checkout/route.ts` | Next.js proxy → API checkout |
| `apps/web/app/api/billing/portal/route.ts`   | Next.js proxy → API portal |
| `apps/web/app/api/me/installation/route.ts`  | Resolves current user's `{orgId, installationId}` |
| `apps/web/components/landing/PricingCta.tsx` | Team CTA → checkout flow handler |
| `apps/web/components/UpgradeIntent.tsx`      | Auto-triggers checkout after OAuth (`?intent=upgrade-team`) |
| `apps/web/components/AuthProvider.tsx`       | Mounts `SessionProvider` for `useSession()` on landing |
| `apps/api/tests/test_billing.py`             | 17 tests: customer create, sub events, webhook signature, lifecycle |
