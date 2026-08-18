# 00 — Start Here: Plain English

> **For:** Nadia and anyone who wants the picture without the engineering detail
> **Last updated:** 2026-08-17 · [Docs index](./README.md) · [Your task list](./17-action-tracker.md)

Everything else in this folder is written for engineers. This one isn't.

---

## The one-paragraph version

Your website's words and pictures live in **GitHub** (think: a Dropbox folder that remembers every change). When you edit something there, **Cloudflare** automatically rebuilds the site and publishes it — live about two minutes later. Your domain stays at **GoDaddy**. Your newsletter stays in **Kit**. Your email stays in **Google**. The only thing that goes away is **Squarespace** — and losing it should make your monthly bill *smaller*, not bigger.

---

## 1. Every tool, what it does, how it connects, what it costs

There are two different kinds of thing on this list, and mixing them up is what made the earlier explanation confusing. So they're separated.

### A. Services — things with an account, a login, and possibly a bill

| Tool | What it does for you | How it connects | Who manages it | Cost |
|---|---|---|---|---|
| **GoDaddy** | Owns the name `nikkostudio.co`. That's all it does. | You change **one setting** — "nameservers" — to point at Cloudflare. Once, forever. | **You** — renew once a year | **~£25–40/yr** *(check your invoice)* |
| **Cloudflare** | The workhorse. Five jobs: ① directs traffic (DNS) ② **hosts the website** ③ runs the form code ④ **stores form submissions** ⑤ blocks spam + basic visitor stats | Connected to your GitHub. Every time you save a change there, it rebuilds and publishes automatically | Set up once with us, then **almost never** | **£0** |
| **GitHub** | Stores the website — the code **and all your words and images**, with full history and one-click undo | This is where you edit content. Cloudflare watches it | **You** — this is your editing home | **£0** |
| **Kit** | Your newsletter: the list, double opt-in, confirmation emails, sequences | Our signup form → Cloudflare → **Kit's API** (with a secret key kept on the server). No Kit code loads on your site | **You**, exactly as today | *Your existing plan* |
| **Google Workspace** | Your business email | Via DNS records (MX). ⚠️ These must be preserved during the move | **You**, as today | *Your existing plan* |
| **Resend** | Sends the two enquiry emails — **one to you**, **one to the person who enquired** | Cloudflare calls its API when a form is submitted. Needs a few DNS records to prove the domain is yours | Set up once with us | **£0** (3,000/mo free — you won't get near it) |
| **Google Tag Manager + GA4** | Detailed traffic analytics — where visitors come from, what they do | A script tag, loaded **only after** someone accepts cookies | **You / marketing** | **£0** |
| ~~**Squarespace**~~ | Your current website | — | — | **Cancel after launch → saves ~£10–20/mo** |

### B. Build tools — no account, no login, no bill

These are not services. **You will never log into them, never pay them, never manage them.** They're programs that run for about 90 seconds on Cloudflare's machine each time you save a change, do their job, and vanish.

| Tool | What it does | Cost |
|---|---|---|
| **Astro** | **Assembles the website.** Takes your text files + the design templates and produces finished web pages | **£0** — open source |
| **TypeScript** | Catches mistakes before they reach the live site | **£0** |
| **Sharp** | Turns your big photos into small fast ones, automatically | **£0** |

---

## 2. "If we're doing email and text on Cloudflare, why do we need Astro?"

Fair question — I listed Astro in the engineering docs and left it out of your table, which made it look like a mystery extra.

**Astro is not a service. It's the tool that builds the pages.**

The analogy: your content files are the manuscript. Astro is the typesetter. Cloudflare is the printer and the delivery van. Cloudflare is very good at *storing and delivering* finished pages — it does not *make* them. Something has to turn "this YAML file of words" plus "this design template" into an actual web page. That's Astro's entire job.

**What it does, concretely:**

| Without Astro | With Astro |
|---|---|
| You'd hand-write raw HTML for every page | You edit plain text; pages are generated |
| The header and footer would be copy-pasted into every page — change the phone number, edit 8 files | Written once, appears everywhere |
| Your words would be tangled up inside the code | **Your words live in separate files you can safely edit** |
| You'd manually make 4 sizes of every image | Automatic |
| A typo in a file breaks the live site | The build fails safely and the old site stays up |

That third row is the one that matters most to you. **Astro is the reason you can edit content at all** without touching code. Take it away and "change the headline yourself" stops being possible.

And it costs nothing, needs no account, and you'll never see it.

---

## 3. Where everything lives

| Thing | Lives in | How you get at it |
|---|---|---|
| Website text | **GitHub** | Edit the file, or the admin screen later |
| Images | **GitHub** | Upload to a folder |
| Newsletter subscribers | **Kit** | Kit dashboard, as today |
| **Enquiry form submissions** | **Cloudflare** (+ optional Google Sheet) | Emailed to you instantly; stored permanently |
| Your emails | **Google Workspace** | Gmail, as today |
| Visitor stats | **Cloudflare** + **GA4** | Two dashboards — see [why both](./17-action-tracker.md#a7--the-honest-trade-off-on-gtm) |
| The live website itself | **Cloudflare** | It just works |

---

## 4. How you change things

**Both your words and your images live in GitHub.** Cloudflare stores nothing you edit — it reads GitHub, rebuilds, publishes. **You never log into Cloudflare to change content.**

### Changing text

1. Go to your repository on **github.com** — e.g. `site/src/content/homepage/hero.yaml`
2. Click the ✏️ pencil
3. Change the words between the quotes
4. Click "Commit changes"
5. **~2 minutes later it's live**

You only ever touch the right-hand side:

```yaml
heading: >
  Like family albums, plastic straws on the ocean floor, and a Nokia 3310
  thrown from a fast-moving car, stories endure.

lead: >
  Nikko is a story studio. We market for memorability, so when it's time to
  buy, book, recommend or return, you're the only one on their mind.
```

Works from your phone's browser. Every change is saved forever and revertible in one click.

### Changing an image

| | What you do | When |
|---|---|---|
| **Easy** | Upload the new image **using the exact same filename** as the old one. Nothing else to change. | Swapping a photo for a better version |
| **Full** | Upload with a new name, then edit the `.yaml` to point at it | A genuinely different image |

**Upload the biggest version you have.** Don't shrink it first — the system makes small fast versions automatically, but it can't invent detail that isn't there.

### Quick reference

| I want to change… | Where | How long |
|---|---|---|
| Headline, paragraph, price, button label | GitHub — a `.yaml` file | 2 min |
| An image | GitHub — upload to the images folder | 2 min |
| A link | GitHub — a `.yaml` file | 2 min |
| Privacy Policy / T&Cs wording | GitHub — a `.md` file | 2 min |
| Layout, colours, animation | Needs an engineer | — |
| A whole new page | Engineer once; then you edit its content | — |

### Making this nicer later

From phase 2 we can add an admin screen at `nikkostudio.co/admin` — log in with GitHub, get normal form fields, a rich text editor, and **drag-and-drop image upload**. Free, optional, saves to the same place. Try file editing first; add this once you know what you actually change often.

---

## 5. What happens to the forms

### Newsletter → Kit

Stays with Kit. List, confirmation email, welcome sequence — all unchanged. The only difference is the signup box is **our design**, and it hands the subscriber to Kit behind the scenes.

**Why not just paste in Kit's embed code?** Because their widget loads third-party JavaScript, sets its own cookies, and can't be styled to match the design. Talking to Kit's API directly gets the identical result with none of that. Kit still does everything it does today.

### Enquiry form → stored, then notified

Your current form is hardcoded HTML posting to a Google Apps Script. It works, but if that script errors or the notification lands in spam, **a £5,000+ enquiry vanishes with no record.**

The replacement:

1. Someone submits
2. It's **saved permanently first** — so it exists even if an email fails
3. **You get an email immediately** with everything they wrote — and you can just hit reply
4. **They get a confirmation** — "we've got it, here's what happens next"
5. Optionally also lands in a **Google Sheet**, if you want the working view you have now

Note the order: today the notification *is* the record. Now the record comes first and the notification is a convenience. Detail: [16](./16-forms-and-data-capture.md).

---

## 6. The one thing that's genuinely urgent

⚠️ **Do not cancel Squarespace yet.**

Squarespace isn't just hosting your website — **it's holding the settings that route your email.** The Google Workspace mail records for `imnadiaamer.com` live in the Squarespace DNS zone.

Cancel it before we move those, and **email to your Google business address stops arriving.**

The fix takes an afternoon and is independent of the website: move DNS to Cloudflare, verify email still flows, *then* cancel whenever you like. Sequence: [15](./15-migration-and-cutover.md).

Two things we noticed while looking:

- **`nikkostudio.co` has no anti-spoofing protection** (no SPF, no DMARC). Anyone can send email that looks like it's from you. Worth fixing regardless.
- **Your current site tells AI crawlers to go away** — Squarespace blocks ChatGPT, Claude, Perplexity and Google's AI by default. Since you want the new site findable in AI search, that's a setting we'll deliberately reverse. Your call: [Q6](./13-open-questions.md).

---

## 7. Your task list

Everything waiting on you — design tasks, decisions, account setup — is in **[17 — Action Tracker](./17-action-tracker.md)**, which is the single checklist so nothing gets forgotten.

Your three design tasks with Claude Design are logged there: **the updated handoff**, **the enquiry form redesign**, and **the cookie consent banner**.

---

**More detail:** [full docs index](./README.md) · [what we're building and why](./01-project-brief.md) · [the rules we build by](./02-engineering-principles.md)
