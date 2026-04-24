import express from "express";
import {Express, NextFunction, Request, Response, Router} from "express";
import { DocRepository } from "../repository/DocRepositiory";
import { cwd } from "process";
import path from "path";
import { loadDocument } from "../loaders/loader";
import { LLM } from "@/app/llm/LLM";
import { generateSummary } from "@/pipeline/summary";
import { generateBriefingDoc } from "@/pipeline/briefing-doc";



export async function updateOrCreateBriefingDoc(req:Request, res:Response, next:NextFunction){
    try{
        //steps 
        //1. get File name
        //2. splitChunks
        //3. call generate summary
        //4. store summary in db
    
        const {userId, noteId}:Record<string, any> = req.body;
        const llm = LLM.getInstance();

        const docRepo = DocRepository.getInstance();
        const doc = await docRepo.getSingleDoc({userId, noteId});
        if(!doc){
            throw new Error("Document not found");
        }

        const currentDir = cwd();
        const uploadDir = path.join(currentDir,"public", "uploads");
        const docFullPath = `${uploadDir}/${doc?.fileName}`

        const splittingDocs = await loadDocument(docFullPath);
        const briefingDoc = await generateBriefingDoc(llm, splittingDocs);
        
        if (!briefingDoc) {
            throw new Error("Failed to generate briefing document");
        }
        
        await docRepo.updateBriefingDoc({userId, noteId, briefingDoc});
        return res.status(200).send({message:"briefing document generated successfully", briefingDoc})
    }catch(err){
        next(err);
    }
}
