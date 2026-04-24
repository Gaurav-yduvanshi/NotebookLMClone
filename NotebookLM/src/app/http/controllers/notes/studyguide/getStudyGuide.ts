import express from "express";
import {Express, NextFunction, Request, Response, Router} from "express";
import { DocRepository } from "../repository/DocRepositiory";


export async function getStudyGuide(req:Request, res:Response, next:NextFunction){
    try{
        const {userId, noteId}:Record<string, any> = req.query; 

        const docRepo = DocRepository.getInstance();
        const doc = await docRepo.getSingleDoc({userId, noteId});
        if(!doc){
            throw new Error("Document not found");
        }

        return res.status(200).send({studyGuide: doc?.studyGuide});
    }catch(err){
        next(err);
    }
}
