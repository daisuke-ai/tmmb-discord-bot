require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || process.env.WEBHOOK_PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Storage file for scheduled DMs
const STORAGE_FILE = path.join(__dirname, 'scheduled_dms.json');

// Initialize storage
let scheduledDMs = loadScheduledDMs();

// Load scheduled DMs from file
function loadScheduledDMs() {
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            const data = fs.readFileSync(STORAGE_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading scheduled DMs:', error);
    }
    return [];
}

// Save scheduled DMs to file
function saveScheduledDMs() {
    try {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(scheduledDMs, null, 2));
    } catch (error) {
        console.error('Error saving scheduled DMs:', error);
    }
}

// Message templates
function getMessageTemplate(count, firstName, coachName, calendarLink) {
    const templates = {
        7: `Hey ${firstName}! 👋

${coachName} here - just wanted to check in on your first week in the Inner Circle!

Quick questions:
- Have you posted any content yet?
- How did your onboarding call go?
- Any roadblocks I can help with?
- Are you attending the group calls?

Don't hesitate to DM me anytime.

The faster you take action, the faster you'll see results. Let's make this week count!`,

        30: `${firstName}! 🎉

You've officially been in the Inner Circle for a month!

Time for your first progress review.

BOOK YOUR 30-DAY REVIEW CALL: ${calendarLink}

We'll discuss:
✓ What's working for you
✓ What needs adjusting
✓ Your next 60 days strategy
✓ Any obstacles to overcome

So, just a quick check-in to make sure you're on the right track/see what we can do to help.

Look forward to chatting.

${coachName}`,

        90: `${firstName}! 🔥

90 days in the Inner Circle! This is a major milestone.

You've now had:
✓ 12+ weeks of 1-on-1 coaching
✓ Dozens of group training calls
✓ Access to brand connections
✓ Your custom action plan and support

It's time for your major quarterly review.

BOOK YOUR 90-DAY REVIEW: ${calendarLink}

We'll cover:
✓ Your progress since joining
✓ What's gone well/what hasn't
✓ Setting your next 90-day targets
✓ Getting you on the right track

Look forward to chatting!

${coachName}`
    };

    return templates[count] || null;
}

// Webhook endpoint to receive data from GoHighLevel
app.post('/webhook/gohighlevel', async (req, res) => {
    console.log('📥 Received webhook from GoHighLevel');
    console.log('Payload:', JSON.stringify(req.body, null, 2));

    try {
        const data = req.body;

        // Extract required fields
        const discordUserId = data.discordUserId || data.userId;
        const firstName = data.firstName || data.name || 'User';
        const coachName = data.coachName || 'Your Coach';
        const calendarLink = data.calendarLink || data.calendar_link || 'https://calendly.com';
        const count = parseInt(data.count);

        // Validation
        if (!discordUserId) {
            return res.status(400).json({
                success: false,
                error: 'Missing discordUserId in webhook payload'
            });
        }

        if (!count || ![7, 30, 90].includes(count)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or missing count. Must be 7, 30, or 90'
            });
        }

        // Get the appropriate message template
        const message = getMessageTemplate(count, firstName, coachName, calendarLink);

        if (!message) {
            return res.status(400).json({
                success: false,
                error: `No template found for count: ${count}`
            });
        }

        console.log(`📨 Sending ${count}-day message to ${firstName} (${discordUserId})`);

        // Send DM immediately
        const dmData = {
            discordUserId: discordUserId,
            userName: firstName,
            message: message
        };

        await sendDiscordDM(dmData);

        // Log the sent DM
        scheduledDMs.push({
            id: `${discordUserId}_${count}_${Date.now()}`,
            discordUserId: discordUserId,
            userName: firstName,
            coachName: coachName,
            message: message,
            count: count,
            sent: true,
            sentAt: new Date().toISOString()
        });
        saveScheduledDMs();

        console.log(`✅ ${count}-day DM sent to ${firstName}`);

        res.json({
            success: true,
            message: `${count}-day DM sent successfully`,
            data: {
                discordUserId: discordUserId,
                firstName: firstName,
                count: count,
                sentAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error processing webhook:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        scheduledDMs: scheduledDMs.length,
        pendingDMs: scheduledDMs.filter(dm => !dm.sent).length
    });
});

// View all scheduled DMs
app.get('/scheduled', (req, res) => {
    res.json({
        total: scheduledDMs.length,
        pending: scheduledDMs.filter(dm => !dm.sent),
        sent: scheduledDMs.filter(dm => dm.sent)
    });
});

// No cron jobs needed - GHL handles timing and triggers webhooks

// Import Discord bot functions
let discordBot = null;

// Wait for Discord bot to be ready before sending DMs
function initializeDiscordBot() {
    try {
        discordBot = require('./bot');
        console.log('✅ Discord bot integration loaded');
    } catch (error) {
        console.error('❌ Error loading Discord bot:', error);
    }
}

// Initialize after a delay to ensure bot.js is loaded
setTimeout(initializeDiscordBot, 3000);

// Function to send Discord DM
async function sendDiscordDM(dmData) {
    try {
        console.log(`📨 Sending DM to ${dmData.userName} (${dmData.discordUserId})`);
        console.log(`   Message: ${dmData.message}`);

        if (!discordBot) {
            console.log('⚠️ Discord bot not initialized yet, will retry later');
            return;
        }

        // Send DM using Discord bot
        const success = await discordBot.sendScheduledDM(dmData.discordUserId, dmData.message);

        if (success) {
            dmData.sent = true;
            dmData.sentAt = new Date().toISOString();
            saveScheduledDMs();
            console.log(`✅ DM sent successfully`);
        } else {
            console.log(`⚠️ Failed to send DM, will retry later`);
        }

    } catch (error) {
        console.error(`❌ Error sending DM to ${dmData.userName}:`, error);
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Webhook server running on port ${PORT}`);
    console.log(`📍 Webhook URL: http://localhost:${PORT}/webhook/gohighlevel`);
    console.log(`💚 Health check: http://localhost:${PORT}/health`);
    console.log(`📋 View sent DMs: http://localhost:${PORT}/scheduled`);
    console.log(`✅ Ready to receive webhooks from GoHighLevel`);
});
