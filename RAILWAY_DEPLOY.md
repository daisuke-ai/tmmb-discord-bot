# Deploy to Railway - Step by Step Guide

Your bot is now ready for Railway deployment! Follow these steps:

---

## Step 1: Create a Railway Account

1. Go to https://railway.app
2. Sign up with GitHub (recommended)
3. Verify your email

---

## Step 2: Deploy Your Project

### Option A: Deploy from GitHub (Recommended)

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Discord bot with webhook"
   git branch -M main
   git remote add origin https://github.com/yourusername/tmmb-bot.git
   git push -u origin main
   ```

2. **In Railway Dashboard:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `tmmb-bot` repository
   - Railway will auto-detect and deploy

### Option B: Deploy with Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm i -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Initialize and deploy:**
   ```bash
   railway init
   railway up
   ```

---

## Step 3: Add Environment Variables

In your Railway project dashboard:

1. Click on your project
2. Go to **Variables** tab
3. Add these variables:

```
DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN
CHARLIE_USER_ID=193877240788942848
PREMIUM_WINS_CHANNEL_ID=664155085089144858
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
WEBHOOK_PORT=3000
```

**Important:** Railway automatically provides a `PORT` environment variable. Your app should listen on that, but we'll use `WEBHOOK_PORT` as fallback.

---

## Step 4: Generate Public Domain

1. In your Railway project, go to **Settings**
2. Scroll to **Networking**
3. Click **Generate Domain**
4. You'll get a URL like: `https://tmmb-bot-production.up.railway.app`

---

## Step 5: Configure GoHighLevel Webhook

Use your Railway domain as the webhook URL:

```
https://your-app-name.up.railway.app/webhook/gohighlevel
```

**Payload format:**
```json
{
  "discordUserId": "USER_DISCORD_ID",
  "name": "User Name",
  "message": "Optional custom message"
}
```

---

## Step 6: Verify Deployment

### Check if your bot is running:

1. **View logs in Railway:**
   - Click on your project
   - Go to **Deployments** tab
   - Click latest deployment
   - View logs

   You should see:
   ```
   ✅ Bot is online!
   Logged in as: [Bot Name]
   🚀 Webhook server running on port 3000
   ```

2. **Test webhook endpoint:**
   ```bash
   curl https://your-app-name.up.railway.app/health
   ```

   Should return:
   ```json
   {
     "status": "ok",
     "scheduledDMs": 0,
     "pendingDMs": 0
   }
   ```

3. **View scheduled DMs:**
   ```
   https://your-app-name.up.railway.app/scheduled
   ```

---

## Step 7: Test the Workflow

1. **Send test webhook from GoHighLevel** (or use curl):
   ```bash
   curl -X POST https://your-app-name.up.railway.app/webhook/gohighlevel \
     -H "Content-Type: application/json" \
     -d '{
       "discordUserId": "193877240788942848",
       "name": "Test User"
     }'
   ```

2. **Check scheduled DMs:**
   ```
   https://your-app-name.up.railway.app/scheduled
   ```

3. **For immediate testing**, edit `webhook.js` on Railway and change the delays:
   - Line 75: Change `7 * 24 * 60 * 60 * 1000` to `2 * 60 * 1000` (2 minutes)
   - Line 80: Change `30 * 24 * 60 * 60 * 1000` to `5 * 60 * 1000` (5 minutes)
   - Line 85: Change `90 * 24 * 60 * 60 * 1000` to `10 * 60 * 1000` (10 minutes)

   Then redeploy to test DMs coming in minutes instead of days.

---

## Troubleshooting

### Bot not starting?
- Check logs in Railway dashboard
- Verify all environment variables are set
- Make sure `DISCORD_BOT_TOKEN` is valid

### Webhook not receiving requests?
- Test the `/health` endpoint first
- Check Railway logs for errors
- Verify domain is accessible

### DMs not sending?
- Check if user has DMs enabled
- Verify Discord User ID is correct
- Check Railway logs for errors

### View real-time logs:
```bash
railway logs
```

---

## File Storage on Railway

Railway provides **persistent storage** automatically. Your `scheduled_dms.json` file will persist across deployments and restarts.

---

## Costs

- **Free Tier:** $5 credit per month
- **Typical usage for this bot:** ~$1-3/month
- **You get:** 500 hours of uptime (more than enough)

---

## Updating Your Bot

### If deployed via GitHub:
Just push changes to your repo:
```bash
git add .
git commit -m "Update bot"
git push
```

Railway will auto-deploy!

### If deployed via CLI:
```bash
railway up
```

---

## Important URLs

After deployment, save these:

- **Webhook URL:** `https://your-app.up.railway.app/webhook/gohighlevel`
- **Health Check:** `https://your-app.up.railway.app/health`
- **Scheduled DMs:** `https://your-app.up.railway.app/scheduled`

---

## Next Steps

1. Deploy to Railway
2. Get your public domain
3. Configure GoHighLevel with your webhook URL
4. Test with a webhook request
5. Monitor logs to see DMs being scheduled and sent

Good luck! 🚀
