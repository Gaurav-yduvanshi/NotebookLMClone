import express from "express";
import {Express, NextFunction, Request, Response, Router} from "express";
import { DocRepository } from "../repository/DocRepositiory";
import { generateMindMap } from "@/pipeline/mind-map";
import { LLM } from "@/app/llm/LLM";


export async function createOrUpdateMindMap(req:Request, res:Response, next:NextFunction){
    try{
        const llm = LLM.getInstance();
        const {userId, noteId}:Record<string, any> = {
            ...(req.query as Record<string, any>),
            ...(req.body as Record<string, any>),
        };

        const docRepo = DocRepository.getInstance();
        const doc = await docRepo.getSingleDoc({userId, noteId});
        if(!doc){
            throw new Error("Document not found");
        }

        const sourceText = doc?.studyGuide || doc?.briefingDoc;
        if(!sourceText){
            throw new Error("Study Guide or Briefing Doc not found");
        }
        const mindMap = await generateMindMap(llm, sourceText);
        if(!mindMap){
            throw new Error("Failed to generate mind map");
        }

        const mindMapString = typeof mindMap === "string" ? mindMap : JSON.stringify(mindMap);
        await docRepo.updateMindMap({userId, noteId, mindMap: mindMapString});
        return res.status(200).send({mindMap: mindMapString});
    }catch(err){
        next(err);
    }
}
