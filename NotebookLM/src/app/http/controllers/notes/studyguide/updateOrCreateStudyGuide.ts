import express from "express";
import {Express, NextFunction, Request, Response, Router} from "express";
import { DocRepository } from "../repository/DocRepositiory";
import { cwd } from "process";
import path from "path";
import { loadDocument } from "../loaders/loader";
import { LLM } from "@/app/llm/LLM";
import {generteFaq} from "@/pipeline/generate-faq"
import { generateStudyGuide } from "@/pipeline/study-guide";



export async function updateOrCreateStudyGuide(req:Request, res:Response, next:NextFunction){
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
        const studyGuide = await generateStudyGuide(llm, splittingDocs);
        await docRepo.updateStudyGuide({userId, noteId, studyGuide});
        return res.status(200).send({message:"Study Guide generated successfully", studyGuide})
    }catch(err){
        next(err);
    }
}
