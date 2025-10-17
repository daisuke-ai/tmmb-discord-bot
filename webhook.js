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

// Webhook endpoint to receive data from GoHighLevel
app.post('/webhook/gohighlevel', (req, res) => {
    console.log('📥 Received webhook from GoHighLevel');
    console.log('Payload:', JSON.stringify(req.body, null, 2));

    try {
        const data = req.body;

        // Extract relevant information from GoHighLevel webhook
        // Adjust these fields based on your actual GoHighLevel webhook structure
        const discordUserId = data.discordUserId || data.userId;
        const userName = data.name || data.userName || 'User';
        const customMessage = data.message || '';

        if (!discordUserId) {
            return res.status(400).json({
                success: false,
                error: 'Missing discordUserId in webhook payload'
            });
        }

        // Create timestamp for the initial action
        const now = new Date();

        // Calculate future dates (7, 30, 90 days)
        const schedules = [
            {
                days: 7,
                sendAt: new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)),
                message: customMessage || `Hey ${userName}! It's been 7 days since you joined. How's everything going? 🎉`
            },
            {
                days: 30,
                sendAt: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)),
                message: customMessage || `Hey ${userName}! 30 days in - would love to hear about your progress! 💪`
            },
            {
                days: 90,
                sendAt: new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000)),
                message: customMessage || `Hey ${userName}! 90 days milestone! How has your journey been? 🚀`
            }
        ];

        // Add to scheduled DMs
        schedules.forEach(schedule => {
            scheduledDMs.push({
                id: `${discordUserId}_${schedule.days}_${Date.now()}`,
                discordUserId: discordUserId,
                userName: userName,
                message: schedule.message,
                days: schedule.days,
                sendAt: schedule.sendAt.toISOString(),
                sent: false,
                createdAt: now.toISOString()
            });
        });

        // Save to file
        saveScheduledDMs();

        console.log(`✅ Scheduled 3 DMs for user ${userName} (${discordUserId})`);
        console.log(`   - 7 days: ${schedules[0].sendAt.toLocaleString()}`);
        console.log(`   - 30 days: ${schedules[1].sendAt.toLocaleString()}`);
        console.log(`   - 90 days: ${schedules[2].sendAt.toLocaleString()}`);

        res.json({
            success: true,
            message: 'DMs scheduled successfully',
            scheduled: schedules.map(s => ({
                days: s.days,
                sendAt: s.sendAt
            }))
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

// Cron job to check and send DMs every hour
cron.schedule('0 * * * *', () => {
    console.log('⏰ Checking for DMs to send...');
    checkAndSendDMs();
});

// Also check every minute for testing (you can disable this later)
cron.schedule('* * * * *', () => {
    checkAndSendDMs();
});

// Function to check and send DMs
async function checkAndSendDMs() {
    const now = new Date();

    const dmsToSend = scheduledDMs.filter(dm => {
        const sendTime = new Date(dm.sendAt);
        return !dm.sent && sendTime <= now;
    });

    if (dmsToSend.length > 0) {
        console.log(`📤 Found ${dmsToSend.length} DMs to send`);

        for (const dm of dmsToSend) {
            await sendDiscordDM(dm);
        }
    }
}

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
    console.log(`📋 View scheduled DMs: http://localhost:${PORT}/scheduled`);
    console.log(`⏰ Cron job active - checking for DMs every minute`);
});
