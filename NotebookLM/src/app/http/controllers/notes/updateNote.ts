import { Express, NextFunction, Request,Response } from "express";
import { NoteRepository } from "./repository/NoteRepository";
import { generateTitle } from "./helpers/TitleGeneration.ts";
import { generatePrompt } from "./helpers/promptGenerator.ts";
import { cwd } from "process";
import path from "path";
import {LLM} from "../../../llm/LLM.ts"
import { loadDocument } from "./loaders/loader.ts";


export async function updateNote(req: Request, res: Response, next: NextFunction) {
    try{
        const {id, title} = req.body;
        if(!id || !title){
            throw new Error("Note id and title are required");
        }

        const noteRepo = NoteRepository.getInstance();
        const updatedNote = await noteRepo.updateNotes({id, title});
        
        return  res.status(200).json({message: "Note updated successfully",  updatedNote});
    }catch(error){
        next(error);
    }
}



