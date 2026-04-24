import express from "express";
import {Express, NextFunction, Request, Response, Router} from "express";
import { DocRepository } from "../repository/DocRepositiory";
import { cwd } from "process";
import path from "path";
import { loadDocument } from "../loaders/loader";
import { LLM } from "@/app/llm/LLM";
import { generateSummary } from "@/pipeline/summary";



export async function updateOrCreateSummary(req:Request, res:Response, next:NextFunction){
    try{
        //steps 
        //1. get File name
        //2. splitChunks
        //3. call generate summary
        //4. store summary in db
    
        const {userId, noteId}:Record<string, any> = req.body;
        const llm = LLM.getInstance();

        const docRepo = DocRepository.getInstance();
        const doc = await docRepo.getSingleDoc({ noteId } as any);
        if(!doc){
            throw new Error(`Document not found for noteId: ${noteId}`);
        }

        const effectiveUserId = userId && String(userId).trim() ? userId : String((doc as any).userId);

        const currentDir = cwd();
        const uploadDir = path.join(currentDir,"public", "uploads");
        const docFullPath = `${uploadDir}/${doc?.fileName}`

        const splittingDocs = await loadDocument(docFullPath);
        const summary = await generateSummary(llm, splittingDocs);
        await docRepo.updateSummary({userId: effectiveUserId, noteId, summary});
        return res.status(200).send({message:"summary generated successfully", summary})
    }catch(err){
        next(err);
    }
}
