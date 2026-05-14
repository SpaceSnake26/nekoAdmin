# NekoLeads — Marketing & Growth Strategy

Owner: nekosys GmbH · Last updated 2026-05-13 (Swiss law + three-lane rewrite)

This document is the source of truth for our outbound, paid, and lead-magnet
funnels. It is opinionated — start here before adding ad-hoc campaigns.

## 0. Swiss legal compliance (read this first)

Switzerland has **no B2B exception** for cold email. Under **UWG Art. 3(1)(o)**
sending mass commercial email without prior opt-in is illegal; **Art. 23 UWG**
makes it a criminal offence punishable by up to 3 years prison or a fine. The
revised **DSG/FADP** (in force Sept 2023) adds transparency + lawful-basis
requirements on top.

What this means in practice:

| Channel | Legal? | Notes |
|---|---|---|
| Mass cold email to leads we found via scan | **No** | Was planned as `cold-pharmacy-audit`. Now retired. |
| Newsletter to opted-in contacts | **Yes** | Audit trail mandatory → `consent_ledger`. Footer must include sender legal name, contact, free one-click opt-out. |
| Email to existing customers about similar services | **Yes** | Strict similarity test. Easy opt-out still required. |
| Personal 1:1 email from a human to a specific named person | **Yes** | Not a Massensendung. Lane C in our model. |
| LinkedIn DMs (manual or platform-native automation) | **Yes** | UWG doesn't cover LinkedIn. Subject to LinkedIn ToS instead. |
| Social posts / reels (broadcast) | **Yes** | Not a 1:1 commercial communication. |
| Postal direct mail | **Yes** | Not "telecommunications". DSG still applies. |

**Every commercial email** must include sender legal name (`nekosys GmbH`),
contact (postal + email), free one-click unsubscribe link via
`/api/unsubscribe?token=…`, and a lawful-basis record in `consent_ledger`.

Bulk-send actions in the host app are gated server-side: recipients without
an active opt-in row are blocked.

~~The old "cold-pharmacy-audit" campaign is retired.~~ It violated UWG Art. 3
and never went live; the three-lane model below replaces it entirely.

## 1. Funnel overview — three legal lanes

```
                ┌──────────────────────────┐
                │      AWARENESS            │
                │  Posts · Reels · Google   │   (legal — broadcast)
                │  Ads · IT-events          │
                └─────────────┬────────────┘
                              ▼
        ┌──────────────────── LEAD ────────────────────┐
        │                                               │
        ▼                                               ▼
 ┌────────────────┐                          ┌─────────────────────┐
 │ Lane A: OPT-IN │                          │ Lane B: LINKEDIN    │
 │ Newsletter +   │                          │ 1:1 DMs via         │
 │ drip via       │ ── consent ledger ──     │ OpenOutreach        │
 │ LISTMONK       │                          │ (Sales Navigator    │
 │                │                          │ + Playwright)       │
 └───────┬────────┘                          └──────┬──────────────┘
         │                                          │
         └──────────────► CRM (leads) ◄─────────────┘
                              ▲
                              │
                  ┌───────────┴───────────┐
                  │ Lane C: PERSONAL 1:1  │
                  │ Niklas writes from    │
                  │ Gmail to ONE named    │
                  │ pharmacy at a time.   │
                  │ Tracked in Kanban     │
                  └───────────────────────┘

         BROADCAST CONTENT FEEDS ALL LANES:
                  ┌─────────────────┐
                  │ POSTIZ          │
                  │ → LinkedIn /    │
                  │   Instagram /   │
                  │   TikTok /      │
                  │   X / YouTube   │
                  └─────────────────┘
```

Old funnel (retired):

```
              ┌────────────────────────────────────────────────────────┐
              │                       AWARENESS                         │
              │  Google Ads · LinkedIn ads · IT-events · press mentions │
              └──────────────────────────┬──────────────────────────────┘
                                         │
              ┌──────────────────────────▼──────────────────────────────┐
              │                     LEAD CAPTURE                         │
              │  /surveys/[id]  (Digital-Audit, embeds via Mautic form) │
              │  AI-Newsletter signup (lead magnet)                     │
              │  GMaps / local.ch scan (cold list)                      │
              └──────────────────────────┬──────────────────────────────┘
                                         │  upsertContact()
              ┌──────────────────────────▼──────────────────────────────┐
              │                MAUTIC (single source of truth)          │
              │  Segments → Campaigns → Emails → Landing pages          │
              └──────────────┬───────────────────────┬───────────────────┘
                             │ webhook              │ form-submit / open / click
              ┌──────────────▼──────────────┐  ┌────▼─────────────────┐
              │  /api/mautic/webhook        │  │  Kanban (sales ops)  │
              │  → email_events table       │  │  cards link to lead  │
              │  → /newsletter dashboard    │  │  + campaign tag      │
              └─────────────────────────────┘  └──────────────────────┘
```

Mautic is the **only** system that sends email. The NekoAdmin host stores the
authoritative CRM (`leads`) and mirrors marketing events for reporting and
sales-ops workflows. No duplicate state, no race conditions.

## 2. Email provider deployment — Listmonk (default), Mautic (legacy fallback)

> **Decision (2026-05-13):** Listmonk replaces Mautic as the default email
> provider. Mautic's bulk-campaign features were sized for the retired cold
> campaign; with Lane A (opt-in only), Listmonk covers 100% of what we need
> with 10% of the ops burden. Mautic adapter stays in the codebase for
> rollback by flipping `EMAIL_PROVIDER` in `.env.local`.

### 2a. Listmonk hosting

Listmonk is a single Go binary + Postgres. Runs happily on a 512 MB VPS.

```yaml
# docker-compose.yml (production-minimal)
services:
  listmonk-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${LISTMONK_DB_PASS}
      POSTGRES_USER: listmonk
      POSTGRES_DB: listmonk
    volumes: ["./db:/var/lib/postgresql/data"]
    restart: unless-stopped

  listmonk:
    image: listmonk/listmonk:latest
    depends_on: [listmonk-db]
    environment:
      LISTMONK_db__host: listmonk-db
      LISTMONK_db__user: listmonk
      LISTMONK_db__password: ${LISTMONK_DB_PASS}
      LISTMONK_db__database: listmonk
      LISTMONK_app__address: "0.0.0.0:9000"
    volumes: ["./uploads:/listmonk/uploads"]
    ports: ["127.0.0.1:9000:9000"]
    restart: unless-stopped
```

Front with Caddy/Traefik for HTTPS. Bind to `newsletter.nekosys.ch`.

Run `./listmonk --install` once for initial schema. Login → Settings →
SMTP/Outbound: configure Postmark/Mailgun. Settings → Bounces &
Webhooks: add the webhook described in §2c.

After Listmonk is up, set in host `.env.local`:

```bash
EMAIL_PROVIDER=listmonk
LISTMONK_BASE_URL=https://newsletter.nekosys.ch
LISTMONK_USERNAME=api
LISTMONK_PASSWORD=••••
LISTMONK_DEFAULT_LIST_ID=1
LISTMONK_WEBHOOK_SECRET=<64 random chars>
```

The host's Newsletter page picks up the new provider automatically and
shows live contact / open / click / bounce / unsubscribe stats.

### 2b. Mautic (legacy)

If we ever need to fall back, the Mautic adapter is at
`src/lib/providers/mautic-adapter.ts` and the original docs are below.

Two viable paths, both supported by this codebase:

| Option | Cost | Time-to-live | Best when |
|---|---|---|---|
| **Mautic Cloud** (mautic.cloud) | from ~€39/mo | < 1h | Small list (<5k), no time to ops |
| **Self-host on Hetzner CX22** | €5.83/mo + €0.50 backup | ~3h | List growing past 5k, full DKIM control |

For self-host we use the official Docker stack:

```yaml
# docker-compose.yml (production-minimal)
services:
  mauticdb:
    image: mariadb:10.11
    environment:
      MYSQL_DATABASE: mautic
      MYSQL_USER: mautic
      MYSQL_PASSWORD: ${DB_PASS}
      MYSQL_ROOT_PASSWORD: ${DB_ROOT}
    volumes: ["./db:/var/lib/mysql"]
    restart: unless-stopped

  mautic:
    image: mautic/mautic:6-apache
    depends_on: [mauticdb]
    environment:
      MAUTIC_DB_HOST: mauticdb
      MAUTIC_DB_USER: mautic
      MAUTIC_DB_PASSWORD: ${DB_PASS}
      MAUTIC_DB_NAME: mautic
      MAUTIC_TRUSTED_PROXIES: '["0.0.0.0/0"]'
    volumes: ["./mautic:/var/www/html"]
    ports: ["127.0.0.1:8080:80"]
    restart: unless-stopped
```

Front with Caddy/Traefik for HTTPS + HTTP/2. Bind to `mautic.nekosys.ch`.

### 2b. DNS + deliverability — non-negotiable

Before sending a single mail in production:

1. **SPF** — add `v=spf1 include:_spf.smtprelay.example.com -all` (or the SMTP
   provider's include).
2. **DKIM** — generate in Mautic Settings → Email DSN, publish the public
   key under `mautic._domainkey.nekosys.ch`.
3. **DMARC** — `v=DMARC1; p=quarantine; rua=mailto:dmarc@nekosys.ch; pct=10`
   for the first 30 days, then raise to `p=reject`.
4. **BIMI** — once DMARC is at p=quarantine for ≥7 days, publish a BIMI record
   pointing at the nekosys logo SVG. Gmail will show the icon next to sends.
5. **SMTP provider** — Postmark for transactional, SendGrid/Mailgun for bulk.
   Never relay both through the same domain — split into `mail.` and `news.`
   subdomains so a campaign issue can't poison transactional reputation.

### 2c. API + webhook wiring

In Mautic:
- Settings → Configuration → API → enable API + HTTP Basic Auth
- Users → create `api-bot` with the **API** role only
- Webhooks → new webhook:
  - Webhook URL: `https://app.nekosys.ch/api/mautic/webhook?secret=<MAUTIC_WEBHOOK_SECRET>`
  - Events: `email_on_send`, `email_on_open`, `page_on_hit`,
    `email_on_bounce`, `lead_dnc_added`

In `.env.local`:
```bash
MAUTIC_BASE_URL=https://mautic.nekosys.ch
MAUTIC_USERNAME=api-bot
MAUTIC_PASSWORD=<from password manager>
MAUTIC_WEBHOOK_SECRET=<64 random chars>
```

Verify with: `curl -sS https://app.nekosys.ch/api/mautic/webhook` → returns
`{ok:true, hint:"…"}`.

## 3. Email marketing campaigns

We run **three concurrent campaigns** in Mautic. Each has its own segment,
sender alias, and DKIM selector so reputation is isolated.

### 3a. ~~Cold outreach: `cold-pharmacy-audit`~~ — RETIRED

> **Removed because it violates Swiss UWG Art. 3(1)(o).** Mass commercial
> email to leads without prior opt-in is criminally penalised (Art. 23 UWG,
> up to 3 years prison or fine). This campaign as originally specified can
> never run in Switzerland.
>
> Replaced by three legally-clean lanes:
>
> 1. **Lane A — Opt-in newsletter** (§3b below). Replaces the volume aspect.
> 2. **Lane B — LinkedIn DMs** via OpenOutreach (see §4). Replaces the
>    "outreach to named pharmacies" aspect; covered by LinkedIn ToS not UWG.
> 3. **Lane C — Personal 1:1 emails** (see §5). Niklas writes individually
>    to high-priority pharmacies from his Gmail. Not a "Massensendung",
>    so falls outside UWG Art. 3(1)(o). Templates in `src/lib/email-templates.ts`
>    serve as the **starting point** for personalisation, never as a blast.
>
> The 3-touch templates (`cold-1`, `followup-1`, `breakup-1`) remain in the
> codebase for Lane C use — `/mailing` page shows a clear Lane-C warning
> banner so no one accidentally bulk-sends them.

### 3b. Nurture: `ai-newsletter-weekly`

| | |
|---|---|
| **Segment** | Anyone with `consent_accepted = true` from newsletter_signups OR survey_responses |
| **Sender** | `ai@nekosys.ch` (brand sender, not personal) |
| **Cadence** | Weekly, Tuesday 09:30 CH-time |
| **Goal** | Stay top-of-mind until they're ready, generate replies |

Content recipe (see §4 for the AI-newsletter angle in detail):
- 1 lead story (200 words, our take on a recent AI/pharmacy story)
- 3 link-outs (curated from the week, raw URLs not sponsored)
- 1 product nudge (link to a recent NekoLeads case study or live demo)
- 1 "reply with…" CTA — kept short, gets us into Mautic's reply-handler

### 3c. Re-engagement: `won-lost-feedback`

| | |
|---|---|
| **Segment** | `status=WON` (6m post-deal) or `status=LOST` (90d post-loss) |
| **Sender** | `digital@nekosys.ch` |
| **Cadence** | Single email |
| **Goal** | Won: testimonial + referral. Lost: structured loss-reason (one-question survey). |

### 3d. Suppression

- Hard bounce → auto-DNC in Mautic, mirrored to `email_events` with
  `eventType='bounce'`
- 3 soft bounces in 30d → DNC
- One-click unsubscribe header on every send (RFC 8058 — required by Gmail
  since 2024 for senders >5k/day)
- Honour `lead_dnc_added` in our host: set `status='LOST'` automatically with
  reason `unsubscribed` (TODO: implement in webhook handler if list exceeds
  1k contacts)

## 4. AI Newsletter (the lead magnet)

Working title: **"Apotheke 2030 — der Wochen-Brief zu KI in der Schweizer
Apotheke."**

Positioning: the only weekly German-language briefing aimed specifically at
Apotheken-IT-Verantwortliche about real, deployable AI. Not breathless
"GPT-5 is here" coverage — actionable, vendor-neutral, sceptical.

### 4a. Why this works

- Our buyer (40–55-year-old Apotheker:in) reads German trade press.
  Nothing in that space covers AI competently.
- Weekly cadence builds the muscle without burning out.
- The newsletter is the funnel: every issue ends with "Möchten Sie das in
  Ihrer Apotheke?" → survey → call.

### 4b. Distribution

1. **Landing page**: `nekoleads.ch/newsletter` (build inside this app under
   `(public)/newsletter` route — separate layout, no admin shell).
2. **Mautic form** embedded in the landing page (single-input email + GDPR
   consent + honeypot).
3. **Promotional channels**:
   - Personal LinkedIn posts (Niklas) every Tuesday after send
   - Apotheker:in-Verbände FB groups (1 post/month, no spam)
   - QR code on the survey thank-you page
   - Footer of every transactional email

### 4c. Production process

- **Mon**: source 5–7 stories, pick lead
- **Tue 09:30**: draft + send (deliberate same-day-as-cadence to keep voice
  fresh)
- **Wed**: read replies, tag responders in Mautic (`segment: warm`)

### 4d. Metrics

- Subscribers: 500 by month 3, 2 000 by month 12
- Open rate: ≥ 40 % (well-curated audience)
- CTR: ≥ 6 %
- Reply rate: ≥ 1 % per send (replies become warm leads)
- Unsub rate: < 0.5 % per send

## 4b. LinkedIn outreach — Lane B (OpenOutreach)

**Tool**: [OpenOutreach](https://github.com/eracle/OpenOutreach) — Python +
Playwright + Bayesian ML matcher, MIT-licensed, self-hosted.

**How the integration works**:

```
                ┌────────────────────────┐
                │ Niklas's LinkedIn      │
                │ + Sales Navigator $99  │
                └───────────┬────────────┘
                            │  logs in once
                            ▼
                ┌────────────────────────┐       ┌──────────────────┐
                │ OpenOutreach (OSS)     │──────►│ NekoAdmin CRM    │
                │ runs Playwright on VPS │       │ outreach_messages│
                │ acts as Niklas's       │       │ leads.status     │
                │ session in the UI      │       │ consent_ledger   │
                └────────────────────────┘       └──────────────────┘
```

Sales Navigator $99/mo is the **data source**; OpenOutreach is the
**actuator** that drives the UI as Niklas. No LinkedIn API key is needed
because we use his authenticated session.

**Daily caps (hard limits, enforced in OpenOutreach config)**:

| Metric | Cap | Why |
|---|---|---|
| Invites sent | ≤ 25/day | LinkedIn's 2026 detection bands |
| DMs to 1st-degree | ≤ 10/day | Same |
| Profile views | ≤ 40/day | Same |
| Working hours | Mon–Fri 09:00–17:00 CH | Human-like pacing |
| Pacing between actions | 30–180 s random | Human-like |
| Auto-pause on warning | 24 h | If LinkedIn shows "unusual activity" |

**Two integration points (we run both)**:

1. **Webhook**: OpenOutreach posts each event (invite-sent,
   invite-accepted, message-sent, reply-received, warning) to
   `POST /api/linkedin/event?secret=…`. Writes to `outreach_messages`;
   on `reply-received` flips `leads.status='REPLIED'` and adds a
   `consent_ledger` row with `kind='linkedin-reply',
   legalBasis='legitimate-interest'`.
2. **Nightly import**: a `tsx scripts/import-openoutreach.ts` cron reads
   OpenOutreach's `db.sqlite3` directly (read-only) and reconciles
   anything the webhook missed.

**Config UI**: `/linkedin` page exposes daily caps, working hours, and a
paused toggle. OpenOutreach polls `GET /api/linkedin/config?secret=…` to
pick up changes.

**Ban-risk acceptance**: every OSS tool of this kind technically violates
LinkedIn ToS §8.2 (no scraping/automation). The caps + pacing reduce but
don't eliminate the risk. If Niklas's account gets a strike, fall back to
Lane C — no rebuild needed.

**Expected metrics** (CH B2B pharmacy buyers via LinkedIn):
- Invite acceptance: 25–40 %
- DM reply rate: 8–15 % of accepted invites
- 1 qualified meeting per 50 invites sent

## 4c. Social broadcast — Lane Awareness (Postiz)

**Tool**: [Postiz](https://github.com/gitroomhq/postiz-app) — self-hosted,
30 platforms, MIT-licensed.

Broadcast posts/reels are not 1:1 commercial communication and fall
outside UWG Art. 3(1)(o). Used to:

1. Warm the audience before LinkedIn DMs land.
2. Drive newsletter signups (link in bio + post CTA).
3. Demonstrate authority on AI-in-CH-pharmacy (the lead magnet's topic).

**Cadence target** (start small, scale only what works):

| Platform | Cadence | Format |
|---|---|---|
| LinkedIn (Niklas personal) | 2× / week | Insight post + 1 carousel/month |
| LinkedIn (nekosys page) | 1× / week | Cross-post of personal + case study |
| Instagram (Reels) | 1× / week | 30 s ai-in-apotheke explainer |
| TikTok | 1× / week | Same Reel, recut for vertical |
| YouTube Shorts | 1× / week | Same content, third recut |
| X | 3× / week | German short takes, links to newsletter |

The host's `/social` page composes once and Postiz fans out to the chosen
platforms via the unified API. Stats land back in `social_posts.stats`
when Postiz reports them.

## 5. Google Ads investment plan

### 5a. Total budget

Phase 1 (months 1–2): **CHF 1 500/mo**, 100 % to Search.
Phase 2 (months 3–6): **CHF 4 000/mo**, 75 % Search, 25 % YouTube.
Phase 3 (month 7+): **CHF 8 000+/mo**, add Performance Max if CAC stays < CHF 400.

### 5b. Phase 1 campaigns (Search only, CH targeting)

| Campaign | Daily | Match | Target landing |
|---|---|---|---|
| Brand defence | CHF 5 | exact `nekoleads`, `nekosys` | / |
| `apotheke website` | CHF 15 | phrase | /landing/apotheke-website |
| `apotheke webshop` | CHF 15 | phrase | /landing/apotheke-webshop |
| `apotheke ki chatbot` | CHF 10 | broad+audience | /landing/ai-newsletter |
| `apothekensoftware test` | CHF 5 | phrase | /surveys/<id>?utm_source=google |

Total: ~CHF 50/day × 30 ≈ CHF 1 500/mo.

### 5c. Landing pages (must exist before spend)

- `/landing/apotheke-website` — 1-product page: "Apotheken-Website in 7 Tagen, CHF 4 800 fix"
- `/landing/apotheke-webshop` — same shape, e-commerce angle
- `/landing/ai-newsletter` — newsletter signup + 2 sample issues visible

Each LP:
- One H1, one CTA (form), no nav
- < 1.5 s LCP on mobile (Lighthouse green)
- UTM-aware `?utm_source=…&utm_campaign=…` flows into Mautic form

### 5d. Conversion tracking

- GA4 + Google Ads conversion linked to the Mautic form-submit event
  (Mautic ships a JS snippet for this; we additionally fire a server-side
  conversion via `gtag('event', 'generate_lead', …)` from the form route to
  defeat ad-blockers)
- Enhanced conversions on: enter email (always), full survey complete (best),
  "book demo" booking link click (best)

### 5e. Bid strategy

Start every campaign in **Maximize conversions (no tCPA)** for 2 weeks to
gather data. Then switch to **tCPA = CHF 300** for Search. Brand stays on
Manual CPC.

### 5f. Negative keywords (always-on)

`praktikum`, `lehre`, `job`, `stellen`, `apotheker werden`, `studium`,
`apothekerin gehalt`, `medikament` (we are *not* a pharmacy).

## 6. Other modern lead-gen channels

### 6a. LinkedIn outbound (founder-led)

- **Niklas** sends 15 personalised connection requests/day to Apotheker:in
  in CH (use Sales Navigator filter: "Pharmacy" + CH + manager+)
- Day 0 accept → no pitch
- Day +3 share a useful link (no sell)
- Day +7 soft pitch: "ich habe für ähnliche Apotheken eine 2-Min-Analyse,
  wäre das interessant? Hier der Link: /surveys/<id>"

Target: 3 surveys/week, 1 call/week, 1 deal/month from LinkedIn alone.

### 6b. IT-Events (see /events page)

Three roles for events:

1. **Bangkok / HCMC / Da Nang** — talent + supplier scouting. Build a
   short-list of devs/agencies who can support delivery. Lead-gen secondary.
2. **Zurich** — sponsor 1 booth/year at the biggest SwissDigitalHealth event
   (rough budget: CHF 8 000 incl. flights + booth). Target 30 surveys
   filled at booth, 80 ideal.
3. **Mittelland** — host one quarterly meetup at our office in Olten or
   Aarau ("Apotheke + KI Stammtisch"). Goal: 20 attendees, 5 surveys, 1 deal.

For every event:
- A row in `/events` with the budget tag
- A Kanban card with checklist
- A UTM-tagged landing page with QR code

### 6c. Content syndication

- Re-publish AI-Newsletter back issues on the nekosys blog after 4 weeks
  (rel=canonical to original send for SEO)
- Submit one long-form quarterly piece to *Schweizer Apothekerzeitung*
- Publish 2× per year a "State of AI in der Apotheke CH" PDF (gated by email)

### 6d. Partnerships

Top 3 to pursue:

1. **Pharmaciegroupe** — they push software to 200 indep. pharmacies. Revenue
   share 20 % first-year ARR.
2. **TopPharm** — co-marketed AI-readiness audit for their 250 members.
3. **PharmaSuisse** — content partnership only (we publish, they distribute).

## 7. KPIs and the weekly review

Run a **15-minute Friday review** in the Kanban view (column: "Marketing
Friday"). Required dashboard:

| Metric | Target | Source |
|---|---|---|
| Newsletter subscribers | +25/wk | `/newsletter` |
| Survey completions | ≥ 5/wk | `/surveys` |
| Reply rate (cold) | ≥ 4 % | Mautic stats |
| Open rate (newsletter) | ≥ 40 % | Mautic stats |
| Pipeline value (Qualified+) | growing | `/leads` filter |
| Google Ads CAC | < CHF 400 | GA4 + closed-won |
| Won this month | ≥ 1 | `/leads?status=WON` |

If a metric is red for 2 weeks running, it gets its own Kanban card with a
named owner and a fix-by date.

## 8. What's intentionally not in scope (yet)

- **SMS / WhatsApp campaigns** — Swiss DSG makes this messy; revisit Q3.
- **Programmatic display** — bad fit for B2B niche this size.
- **Influencer / KOL** — no Apotheke "influencers" worth paying.
- **Cold calling** — explicitly opted-out of; replies > dials for our buyer.
- **Affiliate tracking** — wait until partnerships in §6d are signed.

## 9. Implementation status (host app)

| Component | Status | Path |
|---|---|---|
| Lead DB + scan | ✅ live | `/leads` |
| Public survey | ✅ live | `/surveys/[id]` |
| Email templates (Lane C, copy-paste) | ✅ live | `/mailing` |
| Newsletter signup ingest → consent_ledger | ✅ live | `POST /api/newsletter/signup` |
| Provider-agnostic email layer | ✅ live | `src/lib/email-provider.ts` |
| Listmonk adapter (default) | ✅ live | `src/lib/providers/listmonk.ts` |
| Mautic adapter (legacy fallback) | ✅ live | `src/lib/providers/mautic-adapter.ts` |
| Listmonk webhook ingest | ✅ live | `POST /api/listmonk/webhook` |
| Mautic webhook ingest | ✅ live | `POST /api/mautic/webhook` |
| Newsletter dashboard (provider-aware) | ✅ live | `/newsletter` |
| LinkedIn provider interface | ✅ live | `src/lib/linkedin-provider.ts` |
| OpenOutreach adapter (Lane B) | ✅ live | `src/lib/providers/openoutreach.ts` |
| LinkedIn event webhook | ✅ live | `POST /api/linkedin/event` |
| LinkedIn config endpoint | ✅ live | `GET /api/linkedin/config` |
| LinkedIn dashboard | ✅ live | `/linkedin` |
| Social provider interface | ✅ live | `src/lib/social-provider.ts` |
| Postiz adapter | ✅ live | `src/lib/providers/postiz.ts` |
| Social dashboard | ✅ live | `/social` |
| Consent ledger + viewer | ✅ live | `/compliance` |
| One-click unsubscribe (HMAC) | ✅ live | `GET /api/unsubscribe?token=…` |
| Bulk-send compliance gate | ✅ live | `filterRecipientsWithConsent()` |
| Kanban board | ✅ live | `/kanban` |
| Events directory | ✅ live | `/events` |
| ----- INFRA STILL TODO ----- | | |
| Listmonk VPS deployment | ⬜ todo | see §2a |
| OpenOutreach VPS deployment + Sales Nav login | ⬜ todo | see §4b |
| Postiz VPS deployment + OAuth platform connects | ⬜ todo | see §4c |
| Google Ads conversion wiring | ⬜ todo | see §5d |
| Landing pages | ⬜ todo | see §5c |
| AI-Newsletter editorial workflow | ⬜ todo | see §4c (in nurture) |
| Postal Address + CHE-UID in email footer (`COMPANY_*` env) | ⬜ todo | required by UWG |

Update the status column above when you ship a piece.
