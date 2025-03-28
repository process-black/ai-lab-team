// Simple script to check environment variables
const path = require('path');
const llog = require('learninglab-log');

// Load environment variables
require('dotenv').config({
  path: path.resolve(__dirname, `.env.${process.env.NODE_ENV}`),
});

console.log('======== ENVIRONMENT VARIABLES CHECK ========');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`SLACK_DEBATE_CHANNEL: ${process.env.SLACK_DEBATE_CHANNEL || 'NOT SET'}`);
console.log(`SLACK_BOT_TOKEN: ${process.env.SLACK_BOT_TOKEN ? 'SET (hidden)' : 'NOT SET'}`);
console.log(`SLACK_SIGNING_SECRET: ${process.env.SLACK_SIGNING_SECRET ? 'SET (hidden)' : 'NOT SET'}`);
console.log(`SLACK_APP_TOKEN: ${process.env.SLACK_APP_TOKEN ? 'SET (hidden)' : 'NOT SET'}`);
console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'SET (hidden)' : 'NOT SET'}`);
console.log('============================================');
