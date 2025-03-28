// Script to add SLACK_DEBATE_CHANNEL to your .env file
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Get the NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'dev';
const envFile = path.resolve(__dirname, `.env.${nodeEnv}`);

console.log(`Adding SLACK_DEBATE_CHANNEL to ${envFile}`);

rl.question('Enter your Slack debate channel ID: ', (channelId) => {
  try {
    // Read the current .env file
    let envContent = '';
    try {
      envContent = fs.readFileSync(envFile, 'utf8');
    } catch (err) {
      console.log(`Creating new .env.${nodeEnv} file`);
    }

    // Check if SLACK_DEBATE_CHANNEL already exists
    if (envContent.includes('SLACK_DEBATE_CHANNEL=')) {
      // Replace the existing value
      envContent = envContent.replace(
        /SLACK_DEBATE_CHANNEL=.*/,
        `SLACK_DEBATE_CHANNEL=${channelId}`
      );
    } else {
      // Add the new variable
      envContent += `\nSLACK_DEBATE_CHANNEL=${channelId}\n`;
    }

    // Write back to the file
    fs.writeFileSync(envFile, envContent);
    console.log(`Successfully added SLACK_DEBATE_CHANNEL=${channelId} to ${envFile}`);
  } catch (err) {
    console.error('Error updating .env file:', err);
  } finally {
    rl.close();
  }
});
