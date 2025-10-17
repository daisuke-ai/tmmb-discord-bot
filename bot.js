require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const OpenAI = require('openai');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// Store pending approvals
const pendingApprovals = new Map();

// Configuration from .env
const CHARLIE_USER_ID = process.env.CHARLIE_USER_ID;
const PREMIUM_WINS_CHANNEL_ID = process.env.PREMIUM_WINS_CHANNEL_ID;
const IC_WINS_CHANNEL_ID = process.env.IC_WINS_CHANNEL_ID;

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Bot ready event
client.once('ready', () => {
    console.log('✅ Bot is online!');
    console.log(`Logged in as: ${client.user.tag}`);
    console.log(`Watching channels for significant wins...`);
});

// Message handler
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check if message is in wins channels
    const isPremiumWins = message.channelId === PREMIUM_WINS_CHANNEL_ID;
    const isICWins = message.channelId === IC_WINS_CHANNEL_ID;

    if (!isPremiumWins && !isICWins) return;

    // Determine source
    const source = isPremiumWins ? 'Premium' : 'Inner Circle';

    console.log(`📝 New message from ${message.author.username} in ${source}`);

    // Check if significant using AI
    const isSignificant = await checkIfSignificant(message);

    if (isSignificant) {
        console.log('⭐ SIGNIFICANT WIN DETECTED!');
        await requestPermission(message, source);
    }
});

// Button interaction handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const [action, messageId] = interaction.customId.split('_');
    const approvalData = pendingApprovals.get(messageId);

    if (!approvalData) {
        await interaction.reply({ content: '❌ This request has expired.', ephemeral: true });
        return;
    }

    if (interaction.user.id !== approvalData.authorId) {
        await interaction.reply({ content: '❌ Only the author can respond to this.', ephemeral: true });
        return;
    }

    if (action === 'approve') {
        await interaction.update({ content: '✅ Thanks! Sending your win to Charlie...', components: [] });
        await alertCharlie(approvalData.message, approvalData.source);
        pendingApprovals.delete(messageId);
        console.log(`✅ User approved sharing their win`);
    } else if (action === 'deny') {
        await interaction.update({ content: '❌ No problem! Your win won\'t be shared.', components: [] });
        pendingApprovals.delete(messageId);
        console.log(`❌ User declined sharing their win`);
    }
});

// Function: Check if message is significant using AI
async function checkIfSignificant(message) {
    try {
        // Prepare message content for analysis
        const messageText = message.content || '';
        const hasAttachment = message.attachments.size > 0;
        const attachmentInfo = hasAttachment ? '\n[Message includes an image/screenshot]' : '';

        console.log('  🤖 Analyzing message with AI...');

        // Call OpenAI API for classification
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a win classifier for a business/entrepreneurship community. Your job is to identify SIGNIFICANT wins that would be inspiring and valuable to share with the community leader (Charlie).

A SIGNIFICANT win includes:
- Major financial milestones (e.g., "Just hit my first £1000 day!", "Made £5000 this month")
- Career breakthroughs (e.g., "Quit my 9-5!", "Replaced my salary", "Going full-time")
- Important firsts (e.g., "First client!", "First 5-figure month", "Biggest sale ever")
- Major achievements with proof (screenshots of earnings, testimonials, etc.)
- Record-breaking personal results
- Life-changing business moments

NOT significant:
- Small everyday wins (e.g., "Got a like on my post", "Made £50 today")
- Generic updates without specifics
- Questions or discussions
- Casual conversation
- Minor progress updates

Respond with ONLY "YES" or "NO".`
                },
                {
                    role: 'user',
                    content: `${messageText}${attachmentInfo}`
                }
            ],
            temperature: 0.3,
            max_tokens: 10
        });

        const classification = response.choices[0].message.content.trim().toUpperCase();
        const isSignificant = classification === 'YES';

        if (isSignificant) {
            console.log('  ✅ AI classified as SIGNIFICANT');
        } else {
            console.log('  ❌ AI classified as NOT significant');
        }

        return isSignificant;

    } catch (error) {
        console.error('  ❌ Error with AI classification:', error.message);
        // Fallback: if AI fails, consider messages with attachments or 200+ chars as potentially significant
        const fallback = message.attachments.size > 0 || message.content.length > 200;
        console.log(`  ⚠️ Using fallback classification: ${fallback}`);
        return fallback;
    }
}

// Function: Request permission from user
async function requestPermission(message, source) {
    try {
        // Prepare message preview (first 200 chars)
        const preview = message.content.substring(0, 200);
        const hasMoreText = message.content.length > 200 ? '...' : '';

        // Create buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`approve_${message.id}`)
                    .setLabel('Yes, share it!')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`deny_${message.id}`)
                    .setLabel('No, keep it private')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );

        // Send DM to the author
        await message.author.send({
            content:
                `👋 Hey! I noticed your awesome win in **${source}**:\n\n` +
                `"${preview}${hasMoreText}"\n\n` +
                `🎉 **Can we share this with Charlie?** He loves seeing significant wins from the community!`,
            components: [row]
        });

        // Store approval data
        pendingApprovals.set(message.id, {
            message: message,
            source: source,
            authorId: message.author.id,
            timestamp: Date.now()
        });

        console.log('📨 Permission request sent to user');
    } catch (error) {
        console.error('❌ Error sending permission request:', error);
    }
}

// Function: Send alert to Charlie
async function alertCharlie(message, source) {
    try {
        // Fetch Charlie's user
        const charlie = await client.users.fetch(CHARLIE_USER_ID);

        // Prepare message preview (first 300 chars)
        const preview = message.content.substring(0, 300);
        const hasMoreText = message.content.length > 300 ? '...' : '';

        // Check if has attachment
        const hasAttachment = message.attachments.size > 0 ? '\n📸 Includes screenshot' : '';

        // Send DM to Charlie
        await charlie.send(
            `🚨 **SIGNIFICANT WIN ALERT**\n\n` +
            `**From:** @${message.author.username} in **${source}**\n\n` +
            `**Message:**\n"${preview}${hasMoreText}"\n` +
            `${hasAttachment}\n\n` +
            `📎 **View full message:** ${message.url}`
        );

        console.log('✅ Alert sent to Charlie');
    } catch (error) {
        console.error('❌ Error sending DM to Charlie:', error);
    }
}

// Function to send scheduled DM (called by webhook system)
async function sendScheduledDM(userId, message) {
    try {
        const user = await client.users.fetch(userId);
        await user.send(message);
        console.log(`✅ Scheduled DM sent to ${user.username}`);
        return true;
    } catch (error) {
        console.error(`❌ Error sending scheduled DM to ${userId}:`, error);
        return false;
    }
}

// Export client and function for webhook integration
module.exports = {
    client,
    sendScheduledDM
};

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN);
