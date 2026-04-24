import { generateImage } from "@/app/http/controllers/notes/helpers/generateImage";
import { Note } from "@/app/models/noteSchema";
import agenda from "../agenda";
import fs from 'fs';
import path from 'path';
import { cwd } from 'process';


agenda.define("generateImage", async (job: any) => {
    const { noteId, generateImagePrompt, uploadDir, randomName } = job.attrs.data as any;
    console.log("Starting image generation job for noteId:", noteId);
    console.log("Upload directory:", uploadDir);
    console.log("Image prompt:", generateImagePrompt);

    try {
        // Ensure upload directory exists
        if (!fs.existsSync(uploadDir)) {
            console.log("Creating upload directory:", uploadDir);
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Generate the image
        await generateImage(generateImagePrompt, uploadDir, randomName, (fileName: string) => {
            console.log("Finished image Generation:", fileName);
        });

        // Verify file was created
        const filePath = `${uploadDir}/${randomName}.png`;
        if (fs.existsSync(filePath)) {
            console.log("✅ Image file verified at:", filePath);
        } else {
            console.warn("⚠️ Image file not found at:", filePath);
        }

        // Update the note with the image URL
        const imageUrl = `${process.env.APP_URL}/uploads/${randomName}.png`;
        await Note.findByIdAndUpdate(noteId, { image: imageUrl });
        console.log("✅ Note updated with image URL:", imageUrl);
              
    } catch(imageError: any) {
        console.error("❌ Image generation failed for noteId:", noteId);
        console.error("Error message:", imageError?.message);
        
        // Log the specific error to database or handle gracefully
        // The note will keep its placeholder image URL until generation succeeds
        // You can add a status field to track generation state if needed
    }
});