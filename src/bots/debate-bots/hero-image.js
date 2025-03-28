const llog = require('learninglab-log');
const OpenAI = require('openai');
const createAndUploadImage = require('../poster-maker/create-and-upload-image');

/**
 * Hero Image Bot: Generates a hero image for the debate based on all previous bot responses
 */
const heroImageBot = async ({client, message, glossaryResponse, positionResponse, foeResponse, friendResponse}) => {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Combine all the text from the debate so far
    const allText = `
    Original message: ${message.text}
    
    Glossary bot: ${glossaryResponse}
    
    Position bot: ${positionResponse}
    
    Foe bot: ${foeResponse}
    
    Friend bot: ${friendResponse}
    `;
    
    // Generate a prompt for the image using OpenAI
    llog.cyan("Generating image prompt with OpenAI");
    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
            { 
                role: "system", 
                content: "You are a visual prompt engineer who creates concise, detailed prompts for AI image generation. Your task is to create a prompt for a hero image that represents the main concept and debate in the provided text. The prompt should be visually striking, conceptual, and representative of the term being discussed. Keep the prompt under 100 words and focus on creating a memorable visual representation." 
            },
            { 
                role: "user", 
                content: `Create a prompt for a hero image based on this debate about a technical concept: ${allText}` 
            }
        ],
        max_tokens: 500,
    });

    const imagePrompt = response.choices[0].message.content.trim();
    
    // Post a message that we're generating the image
    await client.chat.postMessage({
        channel: message.channel,
        text: `🎨 *Generating a hero image for this debate...*\n\nPrompt: ${imagePrompt}`,
        thread_ts: message.thread_ts ? message.thread_ts : message.ts,
        username: "Hero Image Bot",
        icon_emoji: ":frame_with_picture:"
    });
    
    try {
        // Check if REPLICATE_API_TOKEN is set
        if (!process.env.REPLICATE_API_TOKEN) {
            throw new Error("REPLICATE_API_TOKEN environment variable is not set");
        }
        
        // Validate channel ID format
        if (!message.channel || typeof message.channel !== 'string') {
            throw new Error(`Invalid channel ID: ${message.channel}`);
        }
        
        // Generate and upload the image using the createAndUploadImage function
        llog.cyan(`Generating image with prompt: ${imagePrompt}`);
        llog.cyan(`Channel: ${message.channel}, Thread: ${message.thread_ts ? message.thread_ts : message.ts}`);
        
        const thread_ts = message.thread_ts ? message.thread_ts : message.ts;
        
        // Add more detailed logging
        llog.magenta("Starting image generation with Replicate...");
        
        // Post a message that we're generating an image
        await client.chat.postMessage({
            channel: message.channel,
            text: `🎨 *Generating a hero image based on the debate...*`,
            thread_ts: thread_ts,
            username: "Hero Image Bot",
            icon_emoji: ":frame_with_picture:"
        });
        
        // Generate the image directly with Replicate
        const replicate = new (require('replicate'))({
            auth: process.env.REPLICATE_API_TOKEN,
        });
        
        const input = {
            prompt: imagePrompt,
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "webp",
            output_quality: 80,
        };
        
        llog.cyan(`Running Replicate with prompt: ${imagePrompt}`);
        
        // Try with the newer model first
        let imageUrl;
        try {
            const output = await replicate.run("stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b", { input });
            llog.cyan("Replicate output:", output);
            imageUrl = output[0];
        } catch (error) {
            llog.red("Error with stability-ai/sdxl model:", error);
            llog.cyan("Falling back to flux-schnell model...");
            
            // Fall back to the original model
            const output = await replicate.run("black-forest-labs/flux-schnell", { input });
            llog.cyan("Replicate output from fallback model:", output);
            imageUrl = output[0];
        }
        
        // Post the image URL directly to the thread
        await client.chat.postMessage({
            channel: message.channel,
            text: `🎨 *Here's your hero image for the debate:*\n\n${imagePrompt}\n\n<${imageUrl}|Click to view image>`,
            thread_ts: thread_ts,
            username: "Hero Image Bot",
            icon_emoji: ":frame_with_picture:"
        });
        
        llog.green("Successfully generated and uploaded hero image");
    } catch (error) {
        llog.red("Error generating hero image:", error);
        llog.red("Error stack:", error.stack);
        
        // Post a more detailed error message
        let errorMessage = `❌ Error generating hero image: ${error.message}`;
        
        // Add suggestions based on common errors
        if (error.message.includes("REPLICATE_API_TOKEN")) {
            errorMessage += "\n\nPlease make sure the REPLICATE_API_TOKEN environment variable is set in your .env file.";
        } else if (error.message.includes("429") || error.message.includes("rate limit")) {
            errorMessage += "\n\nRate limit exceeded. Please try again later.";
        } else if (error.message.includes("auth") || error.message.includes("token") || error.message.includes("API key")) {
            errorMessage += "\n\nAuthentication error. Please check your Replicate API token.";
        }
        
        await client.chat.postMessage({
            channel: message.channel,
            text: errorMessage,
            thread_ts: message.thread_ts ? message.thread_ts : message.ts,
            username: "Hero Image Bot",
            icon_emoji: ":frame_with_picture:"
        });
    }
    
    return imagePrompt;
};

module.exports = heroImageBot;
