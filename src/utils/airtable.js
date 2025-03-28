const axios = require('axios');
const llog = require('learninglab-log');

/**
 * Uploads debate data to Airtable
 * 
 * @param {object} data Object containing debate data to upload
 * @param {string} data.name The term being debated
 * @param {string} data.positionText The position text
 * @param {string} data.glossaryText The glossary definition
 * @param {string} data.foeText The foe's argument
 * @param {string} data.friendText The friend's argument
 * @param {string} data.itDependsText The it-depends bot's middle ground perspective
 * @returns {Promise<object>} The Airtable response
 */
async function uploadDebateToAirtable(data) {
  if (!process.env.AIRTABLE_BASE_ID || !process.env.AIRTABLE_API_TOKEN) {
    throw new Error('Airtable credentials not found in environment variables');
  }

  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = 'TermsAndDebates';
  const apiToken = process.env.AIRTABLE_API_TOKEN;

  llog.magenta(`Uploading debate data to Airtable: ${data.name}`);
  
  try {
    const response = await axios({
      method: 'post',
      url: `https://api.airtable.com/v0/${baseId}/${tableName}`,
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        records: [
          {
            fields: {
              'Name': data.name,
              'PositionText': data.positionText,
              'GlossaryText': data.glossaryText,
              'FoeText': data.foeText,
              'FriendText': data.friendText,
              'ItDependsText': data.itDependsText
            }
          }
        ]
      }
    });

    llog.green(`Successfully uploaded debate data to Airtable. Record ID: ${response.data.records[0].id}`);
    return response.data;
  } catch (error) {
    llog.red('Error uploading to Airtable:', error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * Extracts the term name from the glossary response
 * 
 * @param {string} glossaryText The glossary bot's response text
 * @returns {string} The extracted term name
 */
function extractTermFromGlossary(glossaryText) {
  // Try to find a heading (# Term) in the glossary text
  const headingMatch = glossaryText.match(/^#\s+(.+?)(?:\n|$)/m);
  if (headingMatch && headingMatch[1]) {
    return headingMatch[1].trim();
  }
  
  // Fallback: try to find the first sentence and extract a term
  const firstSentenceMatch = glossaryText.match(/^(.+?)[.!?](?:\s|$)/);
  if (firstSentenceMatch && firstSentenceMatch[1]) {
    // Look for capitalized words that might be the term
    const capitalizedWords = firstSentenceMatch[1].match(/[A-Z][a-z]+/g);
    if (capitalizedWords && capitalizedWords.length > 0) {
      return capitalizedWords[0];
    }
  }
  
  // If all else fails, return "Unknown Term"
  return "Unknown Term";
}

module.exports = {
  uploadDebateToAirtable,
  extractTermFromGlossary
};
