const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Replicate = require('replicate');

/**
 * Creates an image via Replicate and uploads it to Slack.
 *
 * @param {object} client - The Slack client instance.
 * @param {object} scene - An object with at least a "channel" property indicating the Slack channel.
 * @param {string} prompt - The text prompt to generate the image.
 * @param {string} thread_ts - (Optional) The Slack thread timestamp for posting.
 * @returns {object} The response from Slack’s file upload completion.
 */
async function createAndUploadImage(client, scene, prompt, thread_ts) {
  // Check if we have a user token available
  const userToken = process.env.SLACK_USER_TOKEN;
  const useUserToken = !!userToken;
  
  if (useUserToken) {
    console.log('SLACK_USER_TOKEN is available, will use it for file uploads');
  } else {
    console.log('SLACK_USER_TOKEN not found, using bot token');
  }
  console.log(`Starting image creation process for channel: ${scene.channel}, thread: ${thread_ts}`);
  console.log(`Using prompt: ${prompt}`);
  
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not set in the environment variables");
  }
  // 1. Generate the image using Replicate
  console.log("Creating Replicate instance with token", process.env.REPLICATE_API_TOKEN ? "[TOKEN SET]" : "[TOKEN MISSING]");
  
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });
  
  const input = {
    prompt,
    num_outputs: 1,
    aspect_ratio: "1:1",
    output_format: "webp",
    output_quality: 80,
  };
  
  console.log(`Running Replicate with prompt: ${prompt}`);
  
  let imageUrl;
  try {
    // Try with the newer model first
    const output = await replicate.run("stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b", { input });
    console.log("Replicate output:", output);
    // Assume the first output is the image URL.
    imageUrl = output[0];
  } catch (error) {
    console.error("Error with stability-ai/sdxl model:", error);
    console.log("Falling back to flux-schnell model...");
    
    // Fall back to the original model
    const output = await replicate.run("black-forest-labs/flux-schnell", { input });
    console.log("Replicate output from fallback model:", output);
    // Assume the first output is the image URL.
    imageUrl = output[0];
  }
  
  // 2. Download the image
  console.log(`Downloading image from URL: ${imageUrl}`);
  const timestamp = Date.now();
  const filename = `replicate_${timestamp}.webp`;
  const tempDir = path.join(process.cwd(), '_temp');  // You can change this to your preferred temp folder.
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const imagePath = path.join(tempDir, filename);
  
  try {
    const response = await axios.get(imageUrl, { 
      responseType: 'arraybuffer',
      timeout: 30000 // 30 second timeout
    });
    console.log(`Image downloaded, size: ${response.data.length} bytes`);
    fs.writeFileSync(imagePath, response.data);
    console.log(`Image saved to ${imagePath}`);
  } catch (error) {
    console.error(`Error downloading image: ${error.message}`);
    throw new Error(`Failed to download image: ${error.message}`);
  }
  
  const fileSizeInBytes = fs.statSync(imagePath).size;
  
  // 3. Get Slack's upload URL for the external file
  console.log(`Getting upload URL for channel: ${scene.channel}`);
  
  // Validate the channel ID format
  if (!scene.channel || typeof scene.channel !== 'string' || !scene.channel.match(/^[A-Z0-9]+$/)) {
    console.error(`Invalid channel ID format: ${scene.channel}`);
    throw new Error(`Invalid channel ID format: ${scene.channel}. Channel ID should be a string like 'C12345678'`);
  }
  
  let uploadUrl, file_id;
  try {
    // Create a user client if we have a user token
    const uploadClient = useUserToken ? 
      new (client.constructor)({ token: userToken }) : 
      client;
    
    const uploadUrlResponse = await uploadClient.files.getUploadURLExternal({
      filename,
      length: fileSizeInBytes,
    });
    
    if (!uploadUrlResponse.ok) {
      throw new Error(`Failed to get upload URL: ${uploadUrlResponse.error}`);
    }
    
    uploadUrl = uploadUrlResponse.upload_url;
    file_id = uploadUrlResponse.file_id;
    console.log('Successfully got upload URL:', uploadUrl);
    console.log('File ID:', file_id);
  } catch (error) {
    console.error('Error getting upload URL:', error);
    throw new Error(`Failed to get upload URL: ${error.message}`);
  }
  
  // 4. Upload the file contents using Axios
  const fileStream = fs.createReadStream(imagePath);
  await axios.post(uploadUrl, fileStream, {
    headers: {
      'Content-Type': 'image/webp', // Adjust if using another image format.
      'Content-Length': fileSizeInBytes,
    },
  });
  
  // 5. Complete the upload process
  console.log(`Completing upload for file_id: ${file_id}`);
  
  try {
    // Use the appropriate client based on token availability
    const uploadClient = useUserToken ? 
      new (client.constructor)({ token: userToken }) : 
      client;
      
    // First, try to complete the upload without specifying channel
    const completeUploadResponse = await uploadClient.files.completeUploadExternal({
      files: [
        {
          id: file_id,
          title: "Generated Image",
        },
      ],
    });
    
    if (!completeUploadResponse.ok) {
      throw new Error(`Failed to complete upload: ${completeUploadResponse.error}`);
    }
    
    console.log('Successfully completed upload:', completeUploadResponse.file.id);
    
    // Then, share the file to the channel in a separate step
    if (scene.channel) {
      console.log(`Sharing file to channel: ${scene.channel}`);
      try {
        // Use the appropriate client based on token availability
        const shareClient = useUserToken ? 
          new (client.constructor)({ token: userToken }) : 
          client;
          
        await shareClient.files.share({
          file: completeUploadResponse.file.id,
          channel: scene.channel,
          thread_ts: thread_ts,
        });
        console.log('Successfully shared file to channel');
      } catch (shareError) {
        console.error('Error sharing file to channel:', shareError);
        // Don't throw here, we still uploaded the file successfully
      }
    }
  } catch (error) {
    console.error('Error completing upload:', error);
    throw new Error(`Failed to complete upload: ${error.message}`);
  }
  
  // Return the response or a success message if we got this far
  return { ok: true, message: "Image successfully uploaded and shared" };
}

module.exports = createAndUploadImage;
