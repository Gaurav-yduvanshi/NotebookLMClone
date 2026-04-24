import { Express, NextFunction, Request, Response } from "express";
import { NoteRepository } from "./repository/NoteRepository";
import { DocRepository } from "./repository/DocRepositiory";
import { generateTitle } from "./helpers/TitleGeneration.ts";
import { generatePrompt } from "./helpers/promptGenerator.ts";
import { cwd } from "process";
import path from "path";
import { LLM } from "../../../llm/LLM.ts"
import { loadDocument } from "./loaders/loader.ts";


export async function createNote(req: Request, res: Response, next: NextFunction) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const userId = await req.body?.userId;
        console.log( "debugging createNote",req.body);
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }
        const currentDir = cwd();
        const uploadDir = path.join(currentDir, "public", "uploads");
        const randomName = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const fileName = req.file?.filename;

        const llm = LLM.getInstance();
        const docSplit = await loadDocument(`${uploadDir}/${fileName}`, 1000, 200);

        const firstChunk = getDocChunk(docSplit);



        const title = await generateTitle(llm, firstChunk);

        const generateImagePrompt = await generatePrompt(llm, title);

        // Pre-calculate the image URL
        const imageUrl = `${process.env.APP_URL}/uploads/${randomName}.png`;

        const noteRepo = NoteRepository.getInstance();
        const docRepo = DocRepository.getInstance();

        const newNote = await noteRepo.createNote({ title, image: imageUrl, userId },
            { generateImagePrompt, uploadDir, randomName }
        );


        const newDoc = await docRepo.createDoc({ fileName, title, userId, noteId: newNote._id })
        return res.status(201).json({ message: "Note created successfully", note: newNote });

    } catch (error) {
        next(error);
    }
}



function getDocChunk(docSplit: any[]) {
    const docChunk = [] as any
    if (docSplit.length > 0) {
        docChunk.push(docSplit[0])
    } else {
        throw new Error("The provide document is empty or too small");
    }

    return docChunk;
}