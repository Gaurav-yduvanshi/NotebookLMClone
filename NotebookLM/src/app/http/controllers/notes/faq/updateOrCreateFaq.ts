import express from "express";
import {Express, NextFunction, Request, Response, Router} from "express";
import { DocRepository } from "../repository/DocRepositiory";
import { cwd } from "process";
import path from "path";
import { loadDocument } from "../loaders/loader";
import { LLM } from "@/app/llm/LLM";
import {generteFaq} from "@/pipeline/generate-faq"



export async function updateOrCreateFaq(req:Request, res:Response, next:NextFunction){
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
        const faq = await generteFaq(llm, splittingDocs);
        await docRepo.updateFaq({userId, noteId,FAQ:faq});
        return res.status(200).send({message:"FAQ generated successfully", faq})
    }catch(err){
        next(err);
    }
}
