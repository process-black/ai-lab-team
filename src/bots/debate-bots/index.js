const llog = require('learninglab-log');
const glossaryBot = require('./glossary');
const positionBot = require('./position');
const foeBot = require('./foe');
const friendBot = require('./friend');
const itDependsBot = require('./it-depends');
const heroImageBot = require('./hero-image');
const { uploadDebateToAirtable, extractTermFromGlossary } = require('../../utils/airtable');

/**
 * Main module for debate bots: orchestrates the three bots (glossary, foe, friend)
 * to respond to messages in the debate channel.
 */
module.exports = async ({ client, message, say, event }) => {
    // Check if the message is in the debate channel
    llog.magenta(`Debate bots checking channel match: Message channel ${message.channel} vs env ${process.env.SLACK_DEBATE_CHANNEL}`);
    
    if (!process.env.SLACK_DEBATE_CHANNEL) {
        llog.red("ERROR: SLACK_DEBATE_CHANNEL environment variable is not set!");
        return;
    }
    
    if (message.channel !== process.env.SLACK_DEBATE_CHANNEL) {
        llog.yellow(`Message not in debate channel, skipping. (Message in ${message.channel}, debate channel is ${process.env.SLACK_DEBATE_CHANNEL})`);
        return;
    }

    llog.cyan("Processing message with debate bots");
    
    try {
        // Step 1: Position bot extracts and presents the original position
        llog.cyan("Running Position Bot");
        const positionResponse = await positionBot({
            client,
            message
        });
        
        // Wait a moment between bot responses
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 2: Glossary bot summarizes and defines concepts
        llog.cyan("Running Glossary Bot");
        const glossaryResponse = await glossaryBot({ 
            client, 
            message,
            positionResponse 
        });
        
        // Wait a moment between bot responses
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 3: Foe bot argues against the position
        llog.cyan("Running Foe Bot");
        const foeResponse = await foeBot({ 
            client, 
            message, 
            glossaryResponse 
        });
        
        // Wait a moment between bot responses
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 4: Friend bot argues for the position and defeats foe's arguments
        llog.cyan("Running Friend Bot");
        const friendResponse = await friendBot({ 
            client, 
            message, 
            glossaryResponse, 
            foeResponse 
        });
        
        // Wait a moment between bot responses
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 5: It-Depends bot presents a middle ground perspective
        llog.cyan("Running It-Depends Bot");
        const itDependsResponse = await itDependsBot({
            client,
            message,
            glossaryResponse,
            positionResponse,
            foeResponse,
            friendResponse
        });
        
        // Wait a moment between bot responses
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 6: Hero Image bot generates a visual representation of the debate
        // Commented out for now - will be implemented later
        /*
        llog.cyan("Running Hero Image Bot");
        await heroImageBot({
            client,
            message,
            glossaryResponse,
            positionResponse,
            foeResponse,
            friendResponse,
            itDependsResponse
        });
        */
        
        // Upload debate data to Airtable
        try {
            // Get the term directly from the glossary response object
            const termName = glossaryResponse.term || extractTermFromGlossary(glossaryResponse.text);
            
            llog.cyan("Uploading debate data to Airtable...");
            // Get the glossary definition text
            const glossaryText = glossaryResponse.definition || 
                (glossaryResponse.text ? glossaryResponse.text.replace(/^#\s+.+?(?:\n|$)/m, "").trim() : "");
            
            await uploadDebateToAirtable({
                name: termName,
                positionText: positionResponse,
                glossaryText: glossaryText,
                foeText: foeResponse,
                friendText: friendResponse,
                itDependsText: itDependsResponse
            });
            llog.green("Successfully uploaded debate data to Airtable");
        } catch (airtableError) {
            llog.red("Error uploading to Airtable:", airtableError);
            // Continue execution even if Airtable upload fails
        }
        
        llog.green("Debate bots sequence completed successfully");
    } catch (error) {
        llog.red("Error in debate bots sequence:", error);
    }
};