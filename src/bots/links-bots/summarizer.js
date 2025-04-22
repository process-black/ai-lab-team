// summarizer.js  – GPT‑4o Structured Outputs + optional Airtable write
require("dotenv").config();

const OpenAI   = require("openai").default;
const Airtable = require("airtable");
const llog     = require("learninglab-log");   // optional: colourful logs

/* ───────── helpers ───────── */
function airtableBase() {
  const key  = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_API_TOKEN;
  const base = process.env.AIRTABLE_BASE_ID;
  if (!key || !base) return null;
  Airtable.configure({ apiKey: key });
  return Airtable.base(base);
}

/* ───────── main ───────── */
module.exports = async function summarizer({ client, message, scraperResult }) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  /* schema for Structured Outputs */
  const SummarySchema = {
    type: "object",
    properties: {
      title:    { type: "string" },
      tags:     { type: "array", items: { type: "string" } },
      summary:  { type: "string" },
      markdown: { type: "string" }
    },
    required: ["title", "tags", "summary", "markdown"],
    additionalProperties: false
  };

  /* ask GPT‑4o */
  const rsp = await openai.responses.create({
    model: "gpt-4o-2024-08-06",
    input: [
      { role: "system",
        content: "Return a clean title, 3‑5 tags, a 2‑3‑sentence summary, and a full representation of the web content in markdown with the hero image embedded at the top." },
      { role: "user",
        content: `URL: ${scraperResult.url}

RAW TITLE:
${scraperResult.title}

CONTENT:
${scraperResult.text}` }
    ],
    text: { format: { type: "json_schema", name: "article_summary",
                      schema: SummarySchema, strict: true } }
  });

  const { title, tags, summary, markdown } = JSON.parse(rsp.output_text);

  /* optional Airtable write */
  let recordUrl = null;
  const base = airtableBase();
  if (base) {
    try {
      const ogImageUrl = scraperResult.og && scraperResult.og["og:image"];
      const fields = {
        Title: title,
        URL: scraperResult.url,
        Description: summary,
        Markdown: markdown
      };
      // Slack metadata
      fields.SlackTs = message.ts;
      fields.SlackJson = JSON.stringify(message);
      if (ogImageUrl) {
        fields.OgImageUrl = ogImageUrl;
        fields.OgImageAttachment = [{ url: ogImageUrl }];
      }
      const [{ id }] = await base(process.env.AIRTABLE_TABLE_NAME || "Links").create([{ fields }]);
      // Build record URL with table and view if provided
      const baseId = process.env.AIRTABLE_BASE_ID;
      const tableId = process.env.AIRTABLE_LINKS_TABLE_ID;
      const viewId = process.env.AIRTABLE_LINKS_VIEW_ID;
      if (baseId && tableId && viewId) {
        recordUrl = `https://airtable.com/${baseId}/${tableId}/${viewId}/${id}?blocks=hide`;
      } else {
        recordUrl = `https://airtable.com/${baseId}/${id}`;
      }
    } catch (e) {
      llog.red(`⚠️  Airtable write failed: ${e.message}`);
    }
  } else {
    llog.yellow("ℹ️  Airtable credentials missing – skipped row create");
  }

  /* Slack reply */
  await client.chat.postMessage({
    channel: message.channel,
    thread_ts: message.ts,
    text: [
      `*${title}*`,
      tags.map(t => `\`#${t.replace(/\s+/g, "_")}\``).join(" "),
      "",
      summary,
      recordUrl ? `\n<${recordUrl}|View in Airtable>` : ""
    ].join("\n")
  });

  return { title, tags, summary, markdown, airtableUrl: recordUrl };
};
