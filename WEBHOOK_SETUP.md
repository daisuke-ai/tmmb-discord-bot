# GoHighLevel Webhook Integration

This bot now supports receiving webhooks from GoHighLevel to automatically schedule and send Discord DMs after 7, 30, and 90 days.

## How It Works

1. **GoHighLevel sends webhook** → Your server receives user data
2. **System schedules 3 DMs** → 7 days, 30 days, 90 days from now
3. **Cron job checks every minute** → Sends DMs when the time arrives
4. **Discord bot sends the DM** → User receives automated message

---

## Setup Instructions

### 1. Start Both Services

Run the combined startup script:
```bash
node start.js
```

This starts:
- Discord bot (listens to channels)
- Webhook server (receives GoHighLevel data)

Or run them separately:
```bash
# Terminal 1
node bot.js

# Terminal 2
node webhook.js
```

---

## 2. Configure GoHighLevel Webhook

In your GoHighLevel account:

1. Go to **Settings** → **Webhooks**
2. Create a new webhook
3. Set URL to: `http://your-server-ip:3000/webhook/gohighlevel`
4. Select trigger event (e.g., "Contact Created", "Opportunity Won")
5. Configure the payload to include:

```json
{
  "discordUserId": "USER_DISCORD_ID",
  "name": "User Name",
  "message": "Optional custom message"
}
```

**Important:** You need to map the Discord User ID in GoHighLevel as a custom field.

---

## 3. Webhook Payload Structure

### Required Fields:
- `discordUserId` (string) - The Discord user ID to send DMs to

### Optional Fields:
- `name` (string) - User's name (defaults to "User")
- `message` (string) - Custom message template

### Example Payload:
```json
{
  "discordUserId": "193877240788942848",
  "name": "John Doe",
  "message": "Hey John! It's been {days} days..."
}
```

---

## Testing Locally

### Test the webhook endpoint:

1. Start the bot and webhook server:
```bash
node start.js
```

2. In another terminal, run the test script:
```bash
node test-webhook.js
```

3. Check the console - you should see:
```
✅ Scheduled 3 DMs for user Test User
   - 7 days: [date]
   - 30 days: [date]
   - 90 days: [date]
```

### Modify Test Script

Edit `test-webhook.js` and change the `discordUserId` to your own Discord ID:
```javascript
const testPayload = {
    discordUserId: 'YOUR_DISCORD_USER_ID',
    name: 'Your Name'
};
```

---

## Viewing Scheduled DMs

### Health Check:
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "scheduledDMs": 6,
  "pendingDMs": 3
}
```

### View All Scheduled DMs:
```bash
curl http://localhost:3000/scheduled
```

Or open in browser: `http://localhost:3000/scheduled`

---

## Testing DM Delivery (Immediate)

For testing, you can temporarily modify the dates in `webhook.js`:

Change line 75-77 from:
```javascript
const schedules = [
    {
        days: 7,
        sendAt: new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)),
```

To:
```javascript
const schedules = [
    {
        days: 7,
        sendAt: new Date(now.getTime() + (1 * 60 * 1000)), // 1 minute
```

Now DMs will be sent after 1 minute instead of 7 days!

---

## Default Messages

If no custom message is provided, these default messages are sent:

**7 days:**
```
Hey {userName}! It's been 7 days since you joined. How's everything going? 🎉
```

**30 days:**
```
Hey {userName}! 30 days in - would love to hear about your progress! 💪
```

**90 days:**
```
Hey {userName}! 90 days milestone! How has your journey been? 🚀
```

---

## Production Deployment

### Expose Your Webhook Publicly

Use one of these services to expose your local server:

**Option 1: ngrok**
```bash
ngrok http 3000
```
Copy the HTTPS URL (e.g., `https://abc123.ngrok.io/webhook/gohighlevel`)

**Option 2: Deploy to a server**
- Heroku
- Railway
- DigitalOcean
- AWS

### Environment Variables

Make sure these are set in `.env`:
```env
DISCORD_BOT_TOKEN=your_bot_token
CHARLIE_USER_ID=your_user_id
PREMIUM_WINS_CHANNEL_ID=your_channel_id
OPENAI_API_KEY=your_openai_key
WEBHOOK_PORT=3000
```

---

## File Structure

```
tmmb-bot/
├── bot.js                  # Discord bot (handles messages & DMs)
├── webhook.js              # Webhook server (receives GoHighLevel data)
├── start.js                # Combined startup script
├── test-webhook.js         # Test webhook locally
├── scheduled_dms.json      # Storage for scheduled DMs (auto-created)
├── .env                    # Environment variables
└── WEBHOOK_SETUP.md        # This file
```

---

## Troubleshooting

### Webhook not receiving data?
- Check if server is running: `curl http://localhost:3000/health`
- Verify GoHighLevel webhook URL is correct
- Check firewall/port settings

### DMs not sending?
- Verify Discord bot is online
- Check user ID is correct
- Ensure user has DMs enabled
- Check `scheduled_dms.json` file

### Check logs:
```bash
node start.js
```

Look for:
- `✅ Bot is online!`
- `🚀 Webhook server running on port 3000`
- `✅ Discord bot integration loaded`

---

## API Endpoints

### POST `/webhook/gohighlevel`
Receives webhook data and schedules DMs

### GET `/health`
Returns server health and DM counts

### GET `/scheduled`
Returns all scheduled DMs (pending and sent)

---

## Support

For issues or questions, check the console logs or review the code in:
- `webhook.js` (lines 38-125) - Webhook handling
- `bot.js` (lines 227-237) - DM sending function
