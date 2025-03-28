#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');

// Load environment variables from .env file
const envPath = path.join(process.cwd(), '.env');
let envConfig = {};

if (fs.existsSync(envPath)) {
  envConfig = dotenv.parse(fs.readFileSync(envPath));
  console.log('Loaded existing .env file');
} else {
  console.log('No .env file found, will create one');
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check for required tokens
console.log('\n=== Slack Token Checker ===\n');

// Check SLACK_BOT_TOKEN
const botToken = process.env.SLACK_BOT_TOKEN || envConfig.SLACK_BOT_TOKEN;
console.log(`SLACK_BOT_TOKEN: ${botToken ? '✅ Set' : '❌ Not set'}`);

// Check SLACK_USER_TOKEN
const userToken = process.env.SLACK_USER_TOKEN || envConfig.SLACK_USER_TOKEN;
console.log(`SLACK_USER_TOKEN: ${userToken ? '✅ Set' : '❌ Not set'}`);

// Check SLACK_DEBATE_CHANNEL
const debateChannel = process.env.SLACK_DEBATE_CHANNEL || envConfig.SLACK_DEBATE_CHANNEL;
console.log(`SLACK_DEBATE_CHANNEL: ${debateChannel ? '✅ Set' : '❌ Not set'}`);

// Check REPLICATE_API_TOKEN
const replicateToken = process.env.REPLICATE_API_TOKEN || envConfig.REPLICATE_API_TOKEN;
console.log(`REPLICATE_API_TOKEN: ${replicateToken ? '✅ Set' : '❌ Not set'}`);

console.log('\n');

// Function to prompt for token if not set
const promptForToken = (tokenName, currentValue) => {
  return new Promise((resolve) => {
    if (currentValue) {
      rl.question(`${tokenName} is set. Do you want to update it? (y/N): `, (answer) => {
        if (answer.toLowerCase() === 'y') {
          rl.question(`Enter new ${tokenName}: `, (token) => {
            resolve(token);
          });
        } else {
          resolve(currentValue);
        }
      });
    } else {
      rl.question(`${tokenName} is not set. Enter ${tokenName} (leave empty to skip): `, (token) => {
        resolve(token || currentValue);
      });
    }
  });
};

// Main async function to update tokens
const updateTokens = async () => {
  // Prompt for each token
  const newBotToken = await promptForToken('SLACK_BOT_TOKEN', botToken);
  const newUserToken = await promptForToken('SLACK_USER_TOKEN', userToken);
  const newDebateChannel = await promptForToken('SLACK_DEBATE_CHANNEL', debateChannel);
  const newReplicateToken = await promptForToken('REPLICATE_API_TOKEN', replicateToken);

  // Update env config
  if (newBotToken) envConfig.SLACK_BOT_TOKEN = newBotToken;
  if (newUserToken) envConfig.SLACK_USER_TOKEN = newUserToken;
  if (newDebateChannel) envConfig.SLACK_DEBATE_CHANNEL = newDebateChannel;
  if (newReplicateToken) envConfig.REPLICATE_API_TOKEN = newReplicateToken;

  // Write updated config to .env file
  const envContent = Object.entries(envConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ Updated .env file successfully!');

  // Provide instructions for using the tokens
  console.log('\n=== Next Steps ===');
  console.log('1. Restart your application to load the new environment variables');
  console.log('2. The hero image bot should now be able to upload images using your user token');
  console.log('3. If you still encounter issues, check the channel ID format and permissions');

  rl.close();
};

// Run the update function
updateTokens();
