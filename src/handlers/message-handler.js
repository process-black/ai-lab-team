const llog = require('learninglab-log');
const bkc = require('../bots/bkc-bots');
const debateBots = require('../bots/debate-bots');
const linksBots = require('../bots/links-bots');

const isBotMessage = (message) => {
    return message.subtype === "bot_message";
};

const isInSubthread = (message) => {
    return message.thread_ts && message.thread_ts !== message.ts;
};

exports.parseAll = async ({ client, message, say, event }) => {
    llog.cyan("============ NEW MESSAGE RECEIVED ============");
    llog.cyan(`Channel ID: ${message.channel}`);
    llog.cyan(`Message text: ${message.text}`);
    llog.cyan(`User: ${message.user}`);
    llog.cyan(`Timestamp: ${message.ts}`);
    
    // Log environment variables for debugging
    llog.magenta(`SLACK_DEBATE_CHANNEL env var: ${process.env.SLACK_DEBATE_CHANNEL}`);

        // Check if the message is a bot message
    if (isBotMessage(message)) {
        llog.yellow("Skipped: Bot message detected");
        return;
    }

    // Check if the message is in a subthread
    if (isInSubthread(message)) {
        llog.magenta("Message is in a subthread");
        // Add specific logic for subthread messages here if needed
        return;
    }



    llog.gray(message);
    if (message.text) {
        // Check if message is in the debate channel
        if (message.channel === process.env.SLACK_DEBATE_CHANNEL) {
            llog.magenta("Message in debate channel, processing with debate bots");
            await debateBots({ client, message, say, event });
        } else if (message.channel === process.env.SLACK_UTIL_SCRAPE_LINKS_CHANNEL) {
            llog.magenta("Message in links scrape channel, processing with links-bots");
            await linksBots({ client, message, say, event });
        } else {
            // Process with bkc bots for other channels
            const result = await bkc({ client, message, say, event });
        }
    } else {
        llog.blue("message has no text");
    }
}

