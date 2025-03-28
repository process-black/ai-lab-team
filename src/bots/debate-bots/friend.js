const llog = require('learninglab-log');
const OpenAI = require('openai');

/**
 * Friend bot: Argues FOR the original position, elaborating concepts
 * and defeating the foe's counterarguments.
 */
const friendBot = async ({client, message, glossaryResponse, foeResponse}) => {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    
    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            { 
                role: "system", 
                content: "You are a supportive debate ally who strengthens and defends positions. Your goal is to argue FOR the user's position regarding the main term that was defined by the glossary bot. You should elaborate on the user's position with additional evidence and reasoning, and effectively counter the criticisms raised by the foe bot. Be thorough, persuasive, and constructive in your defense. Your response should be a cohesive argument of about 500-600 words." 
            },
            { 
                role: "user", 
                content: `
                Original message: ${message.text}
                
                Glossary bot's definition: ${glossaryResponse}
                
                Foe bot's counterarguments: ${foeResponse}
                
                Argue FOR the user's position regarding this term. Elaborate on key concepts, provide additional supporting evidence, and systematically refute the counterarguments raised by the Foe bot. Create a compelling case that strengthens the user's original position. Be thorough but concise (500-600 words).`
            }
        ],
        max_tokens: 2000,
    });

    const responseText = response.choices[0].message.content.trim();

    await client.chat.postMessage({
        channel: message.channel,
        text: responseText,
        thread_ts: message.thread_ts ? message.thread_ts : message.ts,
        username: "Friend Bot",
        icon_emoji: ":handshake:"
    });
    
    return responseText;
};

module.exports = friendBot;
