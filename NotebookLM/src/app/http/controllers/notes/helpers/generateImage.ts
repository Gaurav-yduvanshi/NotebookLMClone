import { promises as fsPromises } from 'fs';
import fetch from 'node-fetch';
import { sanitizePrompt } from './promptSanitizer';


export const generateImage = async (prompt:string, uploadPath:string, fileName: string, cb:(fileName: string)=> void)=>{
    // Generate image directly from the image endpoint and persist it to uploads.
    const API_KEY = process.env.FIREWORK_API_KEY;
    
    if(!API_KEY) {
        throw new Error("FIREWORK_API_KEY environment variable is not set");
    }

    // Sanitize the prompt to avoid content moderation issues
    const sanitizedPrompt = sanitizePrompt(prompt);
    console.log("Original prompt:", prompt);
    console.log("Sanitized prompt:", sanitizedPrompt);
   
    const response = await fetch("https://api.fireworks.ai/inference/v1/image_generation/accounts/fireworks/models/japanese-stable-diffusion-xl", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "image/jpeg",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      height: 1024,
      width: 1024,
      steps: 20,
      seed: 0,
      prompt: sanitizedPrompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fireworks API error: ${response.status} - ${errorText}`);
  }

  const buffer = await response.arrayBuffer();
  const filePath = `${uploadPath}/${fileName}.png`;
  await fsPromises.writeFile(filePath, Buffer.from(buffer));
  cb(fileName);
  console.log(`Image generated and saved to: ${filePath}`);
};
