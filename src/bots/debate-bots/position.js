const llog = require('learninglab-log');
const OpenAI = require('openai');

/**
 * Position bot: Extracts and presents the original position from the message
 * in markdown format.
 */
const positionBot = async ({client, message}) => {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    
    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            { 
                role: "system", 
                content: "You are a position extraction bot. Your task is to identify and clearly state the main position or argument from the user's message. First, identify the main technical term being discussed, then extract the user's position on that term. Format your response in markdown with an h2 heading 'The Position', followed by the original message in bold, and then your intuited position statement." 
            },
            { 
                role: "user", 
                content: `
                Original message: ${message.text}
                
                Extract the main position from the original message. First, identify the main technical term being discussed, then extract the user's position on that term. Format your response as follows:
                
                ## The Position
                
                **Initial slack message:** ${message.text}
                
                [insert your intuited position here - be clear and concise]`
            }
        ],
        max_tokens: 1000,
    });

    const responseText = response.choices[0].message.content.trim();

    await client.chat.postMessage({
        channel: message.channel,
        text: responseText,
        thread_ts: message.thread_ts ? message.thread_ts : message.ts,
        username: "Position Bot",
        icon_emoji: ":pushpin:"
    });
    
    return responseText;
};

module.exports = positionBot;
