const llog = require('learninglab-log');
const scraper = require('./scraper');
const summarizer = require('./summarizer');
const playwrightScraper = require('./playwright-scraper');
const nextScraper = require('./next-scraper');

// Extract URLs from Slack message object (links or blocks)
function extractLinks(message) {
  if (Array.isArray(message.links)) {
    return message.links.map(l => l.url);
  }
  if (Array.isArray(message.blocks)) {
    const urls = [];
    for (const block of message.blocks) {
      if (!Array.isArray(block.elements)) continue;
      for (const elem of block.elements) {
        if (!Array.isArray(elem.elements)) continue;
        for (const sub of elem.elements) {
          if (sub.type === 'link' && sub.url) urls.push(sub.url);
        }
      }
    }
    return urls;
  }
  return [];
}

const wait = (seconds) => new Promise(resolve => setTimeout(resolve, seconds*1000));

module.exports = async ({ client, message, say, event }) => {
    llog.magenta(`Airtable base: ${process.env.AIRTABLE_BASE_ID}, table: ${process.env.AIRTABLE_TABLE_NAME}, token: ${process.env.AIRTABLE_API_TOKEN ? 'set' : 'not set'}`);
    llog.cyan("got a message in the news channel; news bots will respond")
    const links = extractLinks(message);
    if (!links.length) {
        llog.yellow("No links found in message");
        return;
    } else {
        llog.magenta(`Found ${links.length} links in message`);
        for (const link of links) {
            llog.magenta(`Link: ${link}`);
            // let scraperResult = await scraper(link);
            // let scraperResult = await playwrightScraper(link);
            let scraperResult = await nextScraper(link);
            let summaryResult = await summarizer({
                client: client,
                message: message,
                scraperResult: scraperResult
            })
        }
    }
    
    llog.green("News bots sequence completed successfully");
}
