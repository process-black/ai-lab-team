// scraper.js
const axios = require("axios");
const cheerio = require("cheerio");
const llog = require("learninglab-log");
const fs   = require("fs");
const path = require("path");

module.exports = async function scraper(url) {
  try {
    /* ─────── fetch ─────── */
    const { data: html } = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LearningLabBot/1.0)"
      },
      timeout: 20_000
    });

    /* ─────── parse ─────── */
    const $ = cheerio.load(html);
    $("script, style, noscript").remove();

    const title = $("head > title").text().trim();
    const text  = $("body").text().replace(/\s+/g, " ").trim();

    /* ─────── debug logs ─────── */
    llog.yellow(`🔎 SCRAPER RAW HTML (${url}) — first 20000 chars ↓\n${html
      .slice(0, 20000)
      .replace(/\n+/g, " ")
      .trim()}\n…`);
    llog.yellow(
      `🔎 SCRAPER CLEAN TEXT PREVIEW — first 400 chars ↓\n${text.slice(
        0,
        400
      )} …`
    );

    /* Optional: write full HTML to /tmp so you can open in VS Code. */
    // const file = path.join("/tmp", `scraped_${Date.now()}.html`);
    // fs.writeFileSync(file, html);
    // llog.magenta(`Full HTML written to ${file}`);

    return { url, title, text, raw: html };
  } catch (err) {
    console.error(`Error scraping ${url}:`, err);
    throw err;
  }
};
