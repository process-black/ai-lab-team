// playwrightScraper.js
const { chromium } = require("playwright");
const llog = require("learninglab-log");

/* convert WebVTT cues → plain text */
function vttToText(vtt) {
  return vtt
    .replace(/^WEBVTT[\s\S]*?\n\n/, "")   // header
    .replace(/(\d+\n)?\d\d:\d\d.*\n/g, "")// cue numbers + times
    .replace(/\n{2,}/g, "\n")             // collapse blanks
    .trim();
}

module.exports = async function scrapeWithPlaywright(url) {
  const browser = await chromium.launch({ headless: true });
  const page    = await browser.newPage();

  try {
    /* ─── navigate (resilient) ─── */
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

    /* ─── extract OG, YouTube details, caption URL, visible text ─── */
    const data = await page.evaluate(() => {
      /* OG tags */
      const og = {};
      document
        .querySelectorAll("meta[property^='og']")
        .forEach(m => {
          const k = m.getAttribute("property");
          const v = m.getAttribute("content")?.trim();
          if (k && v) og[k] = v;
        });

      /* YouTube JSON (may be undefined) */
      const pr = window.ytInitialPlayerResponse || {};
      const vd = pr.videoDetails || {};
      const description = vd.shortDescription || "";

      /* caption baseUrl (first track) */
      let captionUrl = null;
      try {
        captionUrl =
          pr.captions?.playerCaptionsTracklistRenderer?.captionTracks?.[0]?.baseUrl;
      } catch (_) {}

      const bodyText = document.body.innerText.replace(/\s+/g, " ").trim();

      return {
        og,
        yt: {
          title: vd.title,
          channel: vd.author,
          keywords: vd.keywords,
          viewCount: vd.viewCount,
          lengthSeconds: vd.lengthSeconds
        },
        description,
        captionUrl,
        bodyText
      };
    });

    /* ─── fetch transcript if captionUrl exists ─── */
    let transcript = "";
    if (data.captionUrl) {
      try {
        transcript = await page.evaluate(async url => {
          const vtt = await fetch(url + "&fmt=vtt").then(r => r.text());
          return vtt;
        }, data.captionUrl).then(vttToText);
      } catch (e) {
        llog.yellow(`ℹ️  transcript fetch failed: ${e.message}`);
      }
    }

    /* ─── assemble text for LLM ─── */
    const combinedText = [data.description, transcript || data.bodyText]
      .filter(Boolean)
      .join("\n\n");

    const title =
      data.yt.title ||
      data.og["og:title"] ||
      (await page.title());

    /* ─── debug logs (trimmed) ─── */
    const html = await page.content();
    llog.yellow(`🔎 PLAYWRIGHT HTML 15 KB →\n${html.slice(0, 15_000)}…`);
    llog.yellow(`🔎 DESCRIPTION preview →\n${data.description.slice(0, 400)}…`);
    if (transcript)
      llog.yellow(`🔎 TRANSCRIPT preview →\n${transcript.slice(0, 400)}…`);
    llog.yellow(`🔎 OG TAGS → ${JSON.stringify(data.og, null, 2)}`);

    /* ─── return ─── */
    return {
      url,
      title,
      text: combinedText,
      raw: html,
      og: data.og,
      yt: data.yt,
      transcript
    };
  } finally {
    await browser.close();
  }
};
