// Combined startup script for Discord bot and webhook server
require('./bot');        // Start Discord bot
require('./webhook');    // Start webhook server

console.log('🚀 All systems started!');
console.log('   - Discord bot: Active');
console.log('   - Webhook server: Running');
