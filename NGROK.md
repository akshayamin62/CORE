# Mobile testing with ngrok

Use **one ngrok tunnel** to the frontend. Next.js proxies `/api` and `/uploads` to your local backend (`localhost:5000`), so your phone only needs a single public URL.

## Prerequisites

1. [ngrok account](https://ngrok.com/) (free tier is fine)
2. Install ngrok:
   - Windows: `winget install ngrok.ngrok`
   - Or download from https://ngrok.com/download
3. Authenticate once: `ngrok config add-authtoken YOUR_TOKEN`

## Step 1 — Start backend and frontend

**Terminal 1 — Backend**

```bash
cd backend
npm run dev
```

Runs on `http://localhost:5000`

**Terminal 2 — Frontend**

```bash
cd frontend
npm run dev
```

Runs on `http://localhost:3000`

## Step 2 — Configure frontend for ngrok

Create `frontend/.env.local` (copy from `.env.ngrok.example`):

```env
NEXT_PUBLIC_API_URL=/api
NGROK_FRONTEND_HOST=YOUR-SUBDOMAIN.ngrok-free.app
```

Replace `YOUR-SUBDOMAIN` after you start ngrok (step 3). **Restart the frontend** after editing `.env.local`.

Optional — set backend email/links to your public URL in `backend/.env`:

```env
FRONTEND_URL=https://YOUR-SUBDOMAIN.ngrok-free.app
```

## Step 3 — Start ngrok (frontend only)

**Terminal 3**

```bash
ngrok http 3000
```

Copy the **Forwarding** HTTPS URL, e.g. `https://abc123.ngrok-free.app`

Put the hostname in `frontend/.env.local`:

```env
NGROK_FRONTEND_HOST=abc123.ngrok-free.app
```

Restart frontend (`Ctrl+C`, then `npm run dev` again).

## Step 4 — Open on your phone

Open the ngrok HTTPS URL in your mobile browser (Chrome/Safari).

On the free ngrok interstitial page, tap **Visit Site**.

Login and use the app — API calls go through the same ngrok URL (`/api` → your local backend).

## Troubleshooting

| Problem | Fix |
|--------|-----|
| `Blocked cross-origin request` / 403 on `/_next/*` | Set `NGROK_FRONTEND_HOST` to your exact ngrok hostname and restart frontend |
| `Unable to connect to server` | Ensure backend is running on port 5000 |
| CORS errors | Use `NEXT_PUBLIC_API_URL=/api` (relative), not `localhost:5000` on mobile |
| ngrok URL changed | Free ngrok URLs change each restart — update `NGROK_FRONTEND_HOST` and `FRONTEND_URL` |
| Images/uploads fail | Keep `NEXT_PUBLIC_API_URL=/api` so uploads use the same origin |

## Alternative: two tunnels (frontend + backend)

Only if you prefer direct API access:

```bash
ngrok http 3000   # frontend URL
ngrok http 5000   # backend URL
```

`frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://YOUR-BACKEND.ngrok-free.app/api
NGROK_FRONTEND_HOST=YOUR-FRONTEND.ngrok-free.app
```

`backend/.env`:

```env
FRONTEND_URL=https://YOUR-FRONTEND.ngrok-free.app
```

Backend CORS already allows `*.ngrok-free.app` domains.
