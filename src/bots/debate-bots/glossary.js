const llog = require('learninglab-log');
const OpenAI = require('openai');

/**
 * Glossary bot: Summarizes and fleshes out ideas, providing basic definitions
 * of concepts mentioned in the original message.
 */
const glossaryBot = async ({client, message, positionResponse}) => {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    
    try {
        // Request JSON response from OpenAI
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { 
                    role: "system", 
                    content: "You are a glossary bot that provides concise, clear definitions of technical terms. Identify the SINGLE most important term being discussed in the position statement, then provide a focused 300-word definition of that term for a general audience. Do not break down multiple concepts - focus only on the main term. You must return a JSON object with two fields: 'term' (the technical term) and 'definition' (the 300-word explanation)." 
                },
                { 
                    role: "user", 
                    content: `The original message was: ${message.text}

The Position Bot has identified the following position:
${positionResponse}

Based on this position, identify the single most important technical term and provide a glossary-style definition (about 300 words) for a general audience. Return your response as a JSON object with 'term' and 'definition' fields.` 
                }
            ],
            max_tokens: 1000
        });

        // Parse the JSON response
        const responseContent = response.choices[0].message.content.trim();
        llog.cyan("Glossary bot raw response:", responseContent);
        
        // Sanitize the JSON string to handle control characters
        const sanitizedContent = responseContent
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
            .replace(/\\n/g, '\n') // Handle newlines
            .replace(/\\r/g, '\r') // Handle carriage returns
            .replace(/\\t/g, '\t'); // Handle tabs
        
        const responseJson = JSON.parse(sanitizedContent);
        
        // Validate the response has the expected fields
        if (!responseJson.term || !responseJson.definition) {
            throw new Error("OpenAI response missing required fields: " + responseContent);
        }
        
        // Format the response for Slack with markdown
        const formattedResponse = `# ${responseJson.term}\n\n${responseJson.definition}`;
        
        await client.chat.postMessage({
            channel: message.channel,
            text: formattedResponse,
            thread_ts: message.thread_ts ? message.thread_ts : message.ts,
            username: "Glossary Bot",
            icon_emoji: ":book:"
        });
        
        // Return both the formatted text and the structured data
        return {
            text: formattedResponse,
            term: responseJson.term,
            definition: responseJson.definition
        };
    } catch (error) {
        llog.red("Error in glossary bot:", error.message || 'Unknown error');
        
        // If there's an error parsing JSON, fall back to a simpler approach
        const fallbackResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { 
                    role: "system", 
                    content: "You are a glossary bot that provides concise, clear definitions of technical terms. Your task is to identify the SINGLE most important term being discussed in the position statement, then provide a focused 300-word definition of that term for a general audience. Start your response with '# TERM' where TERM is the technical term you're defining." 
                },
                { 
                    role: "user", 
                    content: `The original message was: ${message.text}

The Position Bot has identified the following position:
${positionResponse}

Based on this position, identify the single most important technical term and provide a glossary-style definition (about 300 words) for a general audience. Start your response with '# TERM' where TERM is the technical term you're defining.` 
                }
            ],
            max_tokens: 1000
        });
        
        const fallbackText = fallbackResponse.choices[0].message.content.trim();
        
        // Try to extract the term from the fallback response
        const termMatch = fallbackText.match(/^#\s+(.+?)(?:\n|$)/m);
        const term = termMatch ? termMatch[1].trim() : "Unknown Term";
        
        await client.chat.postMessage({
            channel: message.channel,
            text: fallbackText,
            thread_ts: message.thread_ts ? message.thread_ts : message.ts,
            username: "Glossary Bot",
            icon_emoji: ":book:"
        });
        
        return {
            text: fallbackText,
            term: term,
            definition: fallbackText.replace(/^#\s+.+?(?:\n|$)/m, "").trim()
        };
    }
};

module.exports = glossaryBot;
