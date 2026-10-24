# n8n + Google Business Profile Setup

## Step 1 — Add n8n to Railway

1. Go to your Railway project: https://railway.com/project/56720c5a-c003-44ba-9102-6ea5bbe3898e
2. Click **+ New** → **Docker Image**
3. Image: `n8nio/n8n`
4. Add these environment variables to the n8n service:

| Variable | Value |
|---|---|
| `N8N_BASIC_AUTH_ACTIVE` | `true` |
| `N8N_BASIC_AUTH_USER` | `admin` |
| `N8N_BASIC_AUTH_PASSWORD` | *(pick a strong password)* |
| `N8N_ENCRYPTION_KEY` | *(random 32-char string — generate at random.org)* |
| `N8N_HOST` | *(paste the Railway URL after deploy, e.g. `n8n-production.up.railway.app`)* |
| `N8N_PORT` | `5678` |
| `N8N_PROTOCOL` | `https` |
| `WEBHOOK_URL` | `https://<your-n8n-railway-url>/` |
| `GENERIC_TIMEZONE` | `America/Boise` |

5. Set port to **5678**
6. Deploy — Railway gives you a URL like `n8n-production-xxxx.up.railway.app`

---

## Step 2 — Google Cloud Project

> **Important:** Business Profile API requires Google approval. Apply now so the clock starts.

1. Go to https://console.cloud.google.com
2. Create a new project: **Bigfoot ProScore**
3. Enable these APIs (APIs & Services → Library):
   - Search "My Business Account Management API" → Enable
   - Search "My Business Business Information API" → Enable  
   - Search "My Business Reviews API" → Enable (may need to request access)
4. Go to **APIs & Services → Credentials**
5. Click **Create Credentials → OAuth 2.0 Client ID**
6. Application type: **Web application**
7. Name: `Bigfoot ProScore n8n`
8. Authorized redirect URIs: `https://<your-n8n-railway-url>/rest/oauth2-credential/callback`
9. Click Create → copy the **Client ID** and **Client Secret**

### Apply for Business Profile API Access
Go to: https://developers.google.com/my-business/content/prereqs
Fill out the form — mention you're building an internal business intelligence tool to display Google reviews for employee performance tracking. Usually approved in 1–5 business days.

---

## Step 3 — Get Your GBP Account & Location IDs

Once API access is approved:

1. Go to https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts/list
2. Click "Try this API" → run it → copy your `account name` (looks like `accounts/123456789`)
3. Then list locations: https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations/list
4. Copy each `name` for your locations (looks like `accounts/123456789/locations/987654321`)

---

## Step 4 — Configure n8n Credential

1. Log in to your n8n instance
2. Go to **Credentials → New**
3. Search "OAuth2 API" → Generic OAuth2
4. Fill in:
   - **Authorization URL**: `https://accounts.google.com/o/oauth2/v2/auth`
   - **Access Token URL**: `https://oauth2.googleapis.com/token`
   - **Client ID**: *(from step 2)*
   - **Client Secret**: *(from step 2)*
   - **Scope**: `https://www.googleapis.com/auth/business.manage`
5. Save → click **Connect** → authorize with your Google account that manages GBP

---

## Step 5 — Import and Configure Workflow

1. In n8n: **Workflows → Import from File**
2. Import `n8n-workflow-gbp-reviews.json` (in this repo root)
3. Open the **Locations** node → replace the placeholder location IDs with your real ones
4. Open the **Fetch Reviews from GBP** node → select your Google credential
5. Click **Activate** to turn on the nightly schedule
6. Hit **Execute** once manually to do the first sync

---

## Step 6 — Verify

After running, check the Reviews tab in The Footprint. Reviews should appear with auto-matched techs where possible. Unmatched ones can be assigned manually from the Reviews tab.

To add more locations later: just add another entry to the **Locations** node in n8n.
