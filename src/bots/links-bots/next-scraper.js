// playwrightScraper.js
const { chromium } = require("playwright");
const llog = require("learninglab-log");
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");

/* convert WebVTT cues → plain text */
function vttToText(vtt) {
  return vtt
    .replace(/^WEBVTT[\s\S]*?\n\n/, "")   // remove header
    .replace(/(\d+\n)?\d\d:\d\d.*\n/g, "")  // drop cue numbers & times
    .replace(/\n{2,}/g, "\n")               // collapse blank lines
    .trim();
}

module.exports = async function scrapeWithPlaywright(url) {
  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();

  try {
    // ─── Navigate with resilient waits ───
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    } catch (err) {
      if (err.name === "TimeoutError") {
        llog.red("domcontentloaded timeout – retrying with load");
        await page.goto(url, { waitUntil: "load", timeout: 30_000 });
      } else {
        throw err;
      }
    }

    // ─── Extract OG tags, YouTube JSON, and visible text ───
    const data = await page.evaluate(() => {
      const og = {};
      document
        .querySelectorAll("meta[property^='og']")
        .forEach(m => {
          const k = m.getAttribute("property");
          const v = m.getAttribute("content")?.trim();
          if (k && v) og[k] = v;
        });

      // YouTube JSON blob
      const pr = window.ytInitialPlayerResponse || {};
      const vd = pr.videoDetails || {};
      const description = vd.shortDescription || "";

      // Caption base URL for transcript
      let captionUrl = null;
      try {
        captionUrl =
          pr.captions?.playerCaptionsTracklistRenderer?.captionTracks?.[0]?.baseUrl;
      } catch (_) {}

      // Fallback visible text
      const bodyText = document.body.innerText.replace(/\s+/g, " ").trim();

      return { og, pr, vd, description, captionUrl, bodyText };
    });

    // ─── Fetch transcript if available ───
    let transcript = "";
    if (data.captionUrl) {
      try {
        const vtt = await page.evaluate(async url => {
          const res = await fetch(url + "&fmt=vtt");
          return res.text();
        }, data.captionUrl);
        transcript = vttToText(vtt);
      } catch (e) {
        llog.yellow(`ℹ️ transcript fetch failed: ${e.message}`);
      }
    }

    // ─── Prepare content for LLM ───
    const ytExists = Boolean(data.vd && Object.keys(data.vd).length);
    let finalText = "";

    if (ytExists) {
      // Combine YouTube description + transcript
      finalText = [data.description, transcript || data.bodyText]
        .filter(Boolean)
        .join("\n\n");
    } else {
      // Use Readability for main article extraction
      const html = await page.content();
      try {
        const dom = new JSDOM(html, { url });
        const article = new Readability(dom.window.document).parse();
        finalText = article?.textContent?.trim() || data.bodyText;
      } catch (e) {
        llog.yellow(`ℹ️ Readability parse failed: ${e.message}`);
        finalText = data.bodyText;
      }
    }

    const title =
      (ytExists && data.vd.title) ||
      data.og["og:title"] ||
      (await page.title());

    // ─── Debug logs (trimmed) ───
    const html = await page.content();
    llog.yellow(`🔎 PLAYWRIGHT HTML 15 KB →\n${html.slice(0, 15_000)}…`);
    if (ytExists) {
      llog.yellow(`🔎 YT description preview →\n${data.description.slice(0, 400)}…`);
      if (transcript)
        llog.yellow(`🔎 TRANSCRIPT preview →\n${transcript.slice(0, 400)}…`);
    } else {
      llog.yellow(`🔎 ARTICLE TEXT preview →\n${finalText.slice(0, 400)}…`);
    }
    llog.yellow(`🔎 OG TAGS → ${JSON.stringify(data.og, null, 2)}`);

    // ─── Return enriched result ───
    return {
      url,
      title,
      text: finalText,
      raw: html,
      og: data.og,
      yt: ytExists ? {
        channel: data.vd.author,
        keywords: data.vd.keywords,
        viewCount: data.vd.viewCount,
        lengthSeconds: data.vd.lengthSeconds
      } : undefined,
      transcript: ytExists ? transcript : undefined
    };
  } finally {
    await browser.close();
  }
};
