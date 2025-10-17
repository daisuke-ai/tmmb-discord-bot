# GoHighLevel Webhook Integration Guide

## Webhook URL
```
https://tmmb-discord-bot-production.up.railway.app/webhook/gohighlevel
```

---

## How It Works

1. **GHL sends webhook** at 7, 30, or 90 days after Discord access
2. **Webhook includes count parameter** (7, 30, or 90)
3. **Bot sends DM immediately** with the appropriate message
4. **No scheduling needed** - GHL handles the timing!

---

## Required Webhook Payload

```json
{
  "discordUserId": "USER_DISCORD_ID",
  "firstName": "John",
  "coachName": "Charlie",
  "calendarLink": "https://calendly.com/coach/meeting",
  "count": 7
}
```

### Field Descriptions

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `discordUserId` | string | ✅ Yes | Discord user ID | `"193877240788942848"` |
| `firstName` | string | ✅ Yes | User's first name | `"John"` |
| `coachName` | string | ✅ Yes | Assigned coach name | `"Charlie"` |
| `calendarLink` | string | ✅ Yes | Booking calendar URL | `"https://calendly.com/..."` |
| `count` | number | ✅ Yes | Must be 7, 30, or 90 | `7` |

---

## Message Templates

### 7-Day Message
Sent when `count: 7`

```
Hey {firstName}! 👋

{coachName} here - just wanted to check in on your first week in the Inner Circle!

Quick questions:
- Have you posted any content yet?
- How did your onboarding call go?
- Any roadblocks I can help with?
- Are you attending the group calls?

Don't hesitate to DM me anytime.

The faster you take action, the faster you'll see results. Let's make this week count!
```

### 30-Day Message
Sent when `count: 30`

```
{firstName}! 🎉

You've officially been in the Inner Circle for a month!

Time for your first progress review.

BOOK YOUR 30-DAY REVIEW CALL: {calendarLink}

We'll discuss:
✓ What's working for you
✓ What needs adjusting
✓ Your next 60 days strategy
✓ Any obstacles to overcome

So, just a quick check-in to make sure you're on the right track/see what we can do to help.

Look forward to chatting.

{coachName}
```

### 90-Day Message
Sent when `count: 90`

```
{firstName}! 🔥

90 days in the Inner Circle! This is a major milestone.

You've now had:
✓ 12+ weeks of 1-on-1 coaching
✓ Dozens of group training calls
✓ Access to brand connections
✓ Your custom action plan and support

It's time for your major quarterly review.

BOOK YOUR 90-DAY REVIEW: {calendarLink}

We'll cover:
✓ Your progress since joining
✓ What's gone well/what hasn't
✓ Setting your next 90-day targets
✓ Getting you on the right track

Look forward to chatting!

{coachName}
```

---

## Setting Up in GoHighLevel

### Step 1: Create Workflow
1. Go to **Automation** → **Workflows**
2. Create trigger: **X days after** "Discord Access Granted" date

### Step 2: Add Webhook Action
1. Add **Webhook** action
2. Method: **POST**
3. URL: `https://tmmb-discord-bot-production.up.railway.app/webhook/gohighlevel`
4. Content-Type: `application/json`

### Step 3: Configure Payload

**For 7-Day Workflow:**
```json
{
  "discordUserId": "{{contact.custom_field.discord_user_id}}",
  "firstName": "{{contact.first_name}}",
  "coachName": "{{contact.custom_field.assigned_coach}}",
  "calendarLink": "{{contact.custom_field.calendar_link}}",
  "count": 7
}
```

**For 30-Day Workflow:**
```json
{
  "discordUserId": "{{contact.custom_field.discord_user_id}}",
  "firstName": "{{contact.first_name}}",
  "coachName": "{{contact.custom_field.assigned_coach}}",
  "calendarLink": "{{contact.custom_field.calendar_link}}",
  "count": 30
}
```

**For 90-Day Workflow:**
```json
{
  "discordUserId": "{{contact.custom_field.discord_user_id}}",
  "firstName": "{{contact.first_name}}",
  "coachName": "{{contact.custom_field.assigned_coach}}",
  "calendarLink": "{{contact.custom_field.calendar_link}}",
  "count": 90
}
```

### Step 4: Required Custom Fields in GHL

Make sure these custom fields exist:
- `discord_user_id` - The user's Discord ID
- `assigned_coach` - Coach name (e.g., "Charlie")
- `calendar_link` - Booking URL

---

## Testing the Webhook

### Test with curl:

**7-Day Message:**
```bash
curl -X POST https://tmmb-discord-bot-production.up.railway.app/webhook/gohighlevel \
  -H "Content-Type: application/json" \
  -d '{
    "discordUserId": "193877240788942848",
    "firstName": "John",
    "coachName": "Charlie",
    "calendarLink": "https://calendly.com/coach/30min",
    "count": 7
  }'
```

**30-Day Message:**
```bash
curl -X POST https://tmmb-discord-bot-production.up.railway.app/webhook/gohighlevel \
  -H "Content-Type: application/json" \
  -d '{
    "discordUserId": "193877240788942848",
    "firstName": "John",
    "coachName": "Charlie",
    "calendarLink": "https://calendly.com/coach/30min",
    "count": 30
  }'
```

### Test with Node.js:
```bash
node test-webhook.js
```

This will send all 3 test messages (7, 30, 90 days) to your Discord!

---

## Success Response

```json
{
  "success": true,
  "message": "7-day DM sent successfully",
  "data": {
    "discordUserId": "193877240788942848",
    "firstName": "John",
    "count": 7,
    "sentAt": "2025-10-17T12:34:56.789Z"
  }
}
```

## Error Responses

### Missing Discord User ID
```json
{
  "success": false,
  "error": "Missing discordUserId in webhook payload"
}
```

### Invalid Count
```json
{
  "success": false,
  "error": "Invalid or missing count. Must be 7, 30, or 90"
}
```

---

## Monitoring

### Check sent DMs:
```
https://tmmb-discord-bot-production.up.railway.app/scheduled
```

### Health check:
```
https://tmmb-discord-bot-production.up.railway.app/health
```

---

## Troubleshooting

### DM not received?
1. Check if user has DMs enabled
2. Verify Discord User ID is correct
3. Check Railway logs for errors

### Webhook not working?
1. Test the `/health` endpoint first
2. Verify payload format matches exactly
3. Check GHL custom fields are populated

### View Railway logs:
```bash
railway logs
```

---

## Deployment

After making changes, push to GitHub:

```bash
git add .
git commit -m "Update webhook for GHL integration"
git push
```

Railway will auto-deploy! ✅
