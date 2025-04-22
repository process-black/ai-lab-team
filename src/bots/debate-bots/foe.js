const llog = require('learninglab-log');
const OpenAI = require('openai');

/**
 * Foe bot: Argues against any perceived position in the original message.
 * Takes the glossary bot's response as additional context.
 */
const foeBot = async ({client, message, glossaryResponse}) => {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    
    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            { 
                role: "system", 
                content: "You are a critical debate opponent who thoughtfully challenges ideas and positions. Your goal is to argue AGAINST the user's position regarding the main term that was defined by the glossary bot. Be respectful but assertive in your critique. Focus on logical fallacies, alternative perspectives, and potential weaknesses in the original position. Your response should be a cohesive argument of about 400-500 words." 
            },
            { 
                role: "user", 
                content: `
                Original message: ${message.text}
                
                Glossary bot's definition: ${glossaryResponse.text}
                
                Argue AGAINST the user's position regarding this term. Present a well-reasoned counterargument that challenges the user's assumptions and offers alternative perspectives. Be thorough but concise (400-500 words).`
            }
        ],
        max_tokens: 1500,
    });

    const responseText = response.choices[0].message.content.trim();

    await client.chat.postMessage({
        channel: message.channel,
        text: responseText,
        thread_ts: message.thread_ts ? message.thread_ts : message.ts,
        username: "Foe Bot",
        icon_emoji: ":face_with_monocle:"
    });
    
    return responseText;
};

module.exports = foeBot;
