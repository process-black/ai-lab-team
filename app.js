const { App } = require("@slack/bolt");
var path = require("path");
var fs = require("fs");
const llog = require("learninglab-log");
global.ROOT_DIR = path.resolve(__dirname);

const handleMessages = require("./src/handlers/message-handler");


require("dotenv").config({
  path: path.resolve(__dirname, `.env.${process.env.NODE_ENV}`),
});

// Log the Slack token values (partially, for safety)
function safeLog(token, name) {
  if (!token) return `${name}: NOT SET`;
  return `${name}: ${token.slice(0, 6)}...${token.slice(-4)} (length: ${token.length})`;
}

console.log(safeLog(process.env.SLACK_BOT_TOKEN, 'SLACK_BOT_TOKEN'));
console.log(safeLog(process.env.SLACK_SIGNING_SECRET, 'SLACK_SIGNING_SECRET'));
console.log(safeLog(process.env.SLACK_APP_TOKEN, 'SLACK_APP_TOKEN'));

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 3000,
});


// app.message("testing testing", handleMessages.testing);
app.message(/.*/, handleMessages.parseAll);

// app.event("file_shared", eventHandler.fileShared);
// app.event("reaction_added", eventHandler.reactionAdded);
// app.event("reaction_removed", eventHandler.reactionRemoved);
// app.event('pin_added', eventHandler.pinAdded);
// app.event('pin_removed', eventHandler.pinRemoved);
// app.event('app_home_opened', eventHandler.appHomeOpened);
// app.event('message', eventHandler.message);
// app.event(/.*/, eventHandler.log);



(async () => {

  if (!fs.existsSync("_temp")) {
    fs.mkdirSync("_temp");
  }
  if (!fs.existsSync("_output")) {
    fs.mkdirSync("_output");
  }
  await app.start(process.env.PORT || 3000);
  llog.yellow("⚡️ Bolt app is running!", process.env.OPENAI_API_KEY);
  let slackResult = await app.client.chat.postMessage({
    channel: process.env.SLACK_LOGGING_CHANNEL,
    text: "starting up the ai-lab-team :rocket:",
  });

  
})();
