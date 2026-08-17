# 00 — Start Here: Plain English

> **For:** Nadia and anyone who wants the picture without the engineering detail
> **Last updated:** 2026-08-17 · [Docs index](./README.md)

Everything else in this folder is written for engineers. This one isn't. It answers three questions: **what am I paying for, what do I have to manage, and how do I change things.**

---

## The one-paragraph version

Your website's words and pictures live in **GitHub** (think: a Dropbox folder with a history of every change). When you edit something there, **Cloudflare** automatically rebuilds the site and publishes it — about two minutes later it's live. Your domain name stays at **GoDaddy**. Your newsletter stays in **Kit**. Your email stays in **Google**. The only thing that goes away is **Squarespace** — and getting rid of it should make your monthly bill *smaller*, not bigger.

---

## 1. The tools, what they're for, and what they cost

| Tool | What it actually does | Do you manage it? | Cost |
|---|---|---|---|
| **GoDaddy** | Owns the name `nikkostudio.co`. Nothing else. | Yes — but only to renew it once a year | **~£25–40/yr** *(check your renewal invoice — `.co` is pricier than `.com`)* |
| **Cloudflare** | Three jobs: (1) directs traffic to the right place — "DNS", (2) **hosts the website**, (3) tells you how many visitors you got | Set up once with us. After that, almost never | **£0** |
| **GitHub** | Stores the website — the code *and* all your words and images, with full history and undo | This is where you'll edit content | **£0** |
| **Kit** | Your newsletter list, signup confirmations, sequences | Already yours, unchanged | *Your existing plan* |
| **Google Workspace** | Your business email | Already yours, unchanged | *Your existing plan* |
| **Resend** | Sends the "someone submitted the enquiry form" email to you, and the "we got your enquiry" email to them | Set up once with us | **£0** (3,000 emails/month free — you will not get close) |
| **Squarespace** | Your current website | — | **Cancel it** once the new site is live |

### Answering your questions directly

**"Do I need to pay for / manage Cloudflare?"**
No payment. Cloudflare's free tier covers everything here — hosting, unlimited traffic, security certificate, analytics. Management is close to zero: we set it up, and after that the only button you'd ever press is "roll back" if a change looked wrong. Realistically you might log in twice a year.

**"Do I need a custom domain if I have that on GoDaddy?"**
No — you keep the domain exactly where it is. **You change one setting at GoDaddy**, once: a field called "nameservers", which currently points at Squarespace and will point at Cloudflare instead. That's it. You never move the domain.

**"Where is the hosting of the website?"**
Cloudflare. Free, fast, worldwide. Squarespace is doing this today and charging you for it.

### What this costs you overall

| | Today | After |
|---|---|---|
| Squarespace | **~£10–20/month** *(check your invoice)* | **£0** — cancelled |
| Domain | ~£25–40/yr | ~£25–40/yr — unchanged |
| Hosting, DNS, analytics, forms | included in Squarespace | **£0** |
| Kit, Google Workspace | your existing plans | unchanged |

**You should end up paying less per month than you do now.** The website itself becomes free to run; the only recurring cost is the domain and the tools you already pay for.

---

## 2. How you change things

This is the important part. **Both your words and your images live in the same place: GitHub.** Cloudflare doesn't store anything you edit — it just reads GitHub, rebuilds the site, and publishes it. You never touch Cloudflare to change content.

### Changing text

1. Go to your repository on **github.com** — e.g. `site/src/content/homepage/hero.yaml`
2. Click the ✏️ pencil icon
3. Change the words between the quotes
4. Click "Commit changes"
5. **~2 minutes later it's live**

The file looks like this — you only ever touch the right-hand side:

```yaml
heading: >
  Like family albums, plastic straws on the ocean floor, and a Nokia 3310
  thrown from a fast-moving car, stories endure.

lead: >
  Nikko is a story studio. We market for memorability, so when it's time to
  buy, book, recommend or return, you're the only one on their mind.
```

Works from your phone's browser. Every change is saved forever and can be undone with one click.

### Changing an image

Two ways, and the first is much easier:

| | What you do | When to use it |
|---|---|---|
| **Easy — replace** | Upload your new image to the images folder **using the exact same filename** as the old one. Nothing else to change. | Swapping a photo for a better version of the same thing |
| **Full — add new** | Upload the new image with a new name, then edit the `.yaml` file to point at the new filename | Adding a genuinely different image |

**Important:** upload the **biggest version you have**. Don't shrink it first. The system automatically makes small, fast versions for phones — but it can't invent detail that isn't there.

### The short answer to "what do I do if I want to change X"

| I want to change… | Where | How long |
|---|---|---|
| A headline, paragraph, price, button label | GitHub — a `.yaml` file | 2 min |
| An image | GitHub — upload to the images folder | 2 min |
| A link | GitHub — a `.yaml` file | 2 min |
| Privacy Policy / T&Cs wording | GitHub — a `.md` file | 2 min |
| Page layout, colours, animation | Needs an engineer | — |
| Adding a whole new page | Needs an engineer (once); then you edit its content yourself | — |

### Making this nicer later

Editing files works from day one and costs nothing. But **from phase 2 we can add a proper admin screen** at `nikkostudio.co/admin` — you log in with GitHub and get normal form fields, a rich text editor, and **drag-and-drop image upload with a media library**. It still saves to the same place; it's just a friendlier front door.

It's free, and it's optional — which is why we're suggesting you try file editing first and add the admin screen once you know what you actually change often. See [Q4](./13-open-questions.md).

---

## 3. What happens to the forms

### Newsletter signup

Stays with **Kit** — the list, the confirmation email, the welcome sequence, all unchanged. The only difference is that the signup box on the new site is **our design**, not Kit's embedded widget, and it hands the subscriber to Kit behind the scenes.

Why not just embed Kit's code? Because their widget loads third-party JavaScript, sets cookies (which would mean a cookie banner), and can't be styled to match the design. Talking to Kit directly from our server gets us the same result with none of that. Kit still does everything it does today.

### Enquiry form

Your current form is hardcoded HTML posting to a Google Apps Script. It works, but nothing is guaranteed — if the script fails or a notification lands in spam, **a £5,000+ enquiry disappears with no record**.

The replacement, in plain terms:

1. Someone submits the form
2. It's **saved permanently** — so it exists even if an email fails
3. **You get an email straight away** with everything they wrote, and you can hit reply to write back to them directly
4. **They get a confirmation email** — "we've got it, here's what happens next"
5. Optionally it also drops into a **Google Sheet**, if you'd like the working view you have now

Detail: [16 — Forms & Data Capture](./16-forms-and-data-capture.md).

---

## 4. The one thing that's genuinely urgent

⚠️ **Do not cancel Squarespace yet.**

We checked your DNS. Squarespace isn't just hosting your website — **it's also holding the settings that route your email.** Specifically, the Google Workspace mail records for `imnadiaamer.com` live in the Squarespace DNS zone.

If Squarespace is cancelled before we move those settings to Cloudflare, **email to your Google business address would stop arriving.**

The fix is straightforward and can be done this week, before any website work: move the DNS to Cloudflare, verify email still flows, *then* cancel Squarespace whenever you like. Full sequence in [15 — Migration & Cutover](./15-migration-and-cutover.md).

Two related things we noticed while looking:

- **`nikkostudio.co` has no anti-spoofing protection** (no SPF, no DMARC). Right now anyone can send email that looks like it's from your domain. Worth fixing regardless of this project — and it's easy once DNS is somewhere sensible.
- **Your current site tells AI crawlers to go away.** Squarespace blocks ChatGPT, Claude, Perplexity and Google's AI by default. Since you've asked for the new site to be findable in AI search, that's a setting we'll need to deliberately reverse — see [Q6](./13-open-questions.md), because it's your call, not ours.

---

## 5. What we need from you

| | Question | Where |
|---|---|---|
| 1 | Confirm your Google business email is on `@imnadiaamer.com` — that's what the DNS shows | [15](./15-migration-and-cutover.md) |
| 2 | Should `imnadiaamer.com` be retired and redirected to `nikkostudio.co`? | [15](./15-migration-and-cutover.md) |
| 3 | Should AI crawlers be allowed to read the site? | [Q6](./13-open-questions.md) |
| 4 | Do you want the Google Sheet kept as your working view of enquiries? | [16](./16-forms-and-data-capture.md) |
| 5 | Do you want to try editing files, or shall we build the admin screen straight away? | [Q4](./13-open-questions.md) |

Nothing is blocked while you think about these — each has a sensible default we'll proceed with.

---

**If you want more detail:** [the full docs index](./README.md) · [what we're building and why](./01-project-brief.md) · [the rules we build by](./02-engineering-principles.md)
