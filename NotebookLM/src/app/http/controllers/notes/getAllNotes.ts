import { Express, NextFunction, Request,Response } from "express";
import { NoteRepository } from "./repository/NoteRepository";
// import { generateTitle } from "./TitleGeneration";
// import { generatePrompt } from "./promptGenerator";
// import { cwd } from "process";
// import path from "path";
// import {LLM} from "../../../llm/LLM.ts"
// import { loadDocument } from "./loader";


export async function getAllNotes(req: Request, res: Response, next: NextFunction) {
    try{
        const query = req.query;
        const search = query.search as string
        const page = parseInt(query?.page as string) || 10;
        const noteRepo = NoteRepository.getInstance();
        const notes = await noteRepo.getAllNotes({
            search: search as string,
            page: page,
            limit: 10
        });

        return res.status(200).json( notes);
    }catch(error){
        next(error);
    }
}



