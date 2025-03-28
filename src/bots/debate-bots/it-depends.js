const llog = require('learninglab-log');
const OpenAI = require('openai');

/**
 * It-Depends Bot: Takes a middle ground position with a slacker vibe
 * Presents a nuanced "it depends" perspective on the debate
 */
const itDependsBot = async ({client, message, glossaryResponse, positionResponse, foeResponse, friendResponse}) => {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    
    try {
        // Extract term from glossary response
        const term = glossaryResponse.term || 
            (typeof glossaryResponse === 'string' ? glossaryResponse.match(/^#\s+(.+?)(?:\n|$)/m)?.[1]?.trim() : null) || 
            "the topic";
        
        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { 
                    role: "system", 
                    content: "You are the 'It-Depends-Bot' who always takes the middle ground in debates with a laid-back, slacker vibe. You use casual language, occasional slang, and a generally chill attitude. You avoid strong positions and instead point out that 'it depends' on various factors. Your tone should be that of someone who can't be bothered to pick a side but still has some interesting insights. Include some 'umms', 'likes', and other filler words occasionally. Keep your response to about 300-400 words."
                },
                { 
                    role: "user", 
                    content: `Here's a debate about ${term}:

Original Position:
${positionResponse}

Glossary Definition:
${typeof glossaryResponse === 'object' ? glossaryResponse.definition : glossaryResponse}

Argument Against:
${foeResponse}

Argument For:
${friendResponse}

Respond with a middle-ground "it depends" perspective with a slacker vibe. Don't be too formal or academic - be casual and a bit indifferent while still making some valid points.`
                }
            ],
            max_tokens: 1200,
        });

        const responseText = response.choices[0].message.content.trim();

        await client.chat.postMessage({
            channel: message.channel,
            text: responseText,
            thread_ts: message.thread_ts ? message.thread_ts : message.ts,
            username: "It-Depends Bot",
            icon_emoji: ":person_shrugging:"
        });
        
        return responseText;
    } catch (error) {
        llog.red("Error in it-depends bot:", error.message || 'Unknown error');
        throw error;
    }
};

module.exports = itDependsBot;
