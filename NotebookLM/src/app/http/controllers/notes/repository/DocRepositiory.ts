import agenda from "@/app/bootstrap/agenda/agenda";
import { generateToken, signAccessToken, signRefreshToken } from "@/app/helper/jwt";
import { Doc } from "@/app/models/docSchema";
import { Types } from "mongoose";
 


export class DocRepository {
    private static instance: DocRepository;

// Singleton pattern to ensure only one instance of DocRepository
    public static getInstance(): DocRepository {
        if (!DocRepository.instance) {
            DocRepository.instance = new DocRepository();
        }

        return DocRepository.instance;
    }


    

    async createDoc(docProps:{fileName:string, title:string, userId:string, noteId:Types.ObjectId}
    ) {

        const doc = new Doc({
            ...docProps
        });

        const newDoc = await doc.save();

        return newDoc.toObject();
    }

    async updateSummary(props:{userId:string, noteId:Types.ObjectId, summary:string}) {
        const {userId, noteId} = props; 
        const updateSummary = await Doc.findOneAndUpdate({userId, noteId},{
            $set: {summary: props.summary}
        },{new : true, runValidators: true});

        if(!updateSummary){
            throw new Error("Document not found or you don't have permission to update it");
        } 
        return updateSummary;
    }

    async updateBriefingDoc(props:{userId:string, noteId:Types.ObjectId, briefingDoc:string}) {
        const {userId, noteId} = props; 
        const updateBriefingDoc = await Doc.findOneAndUpdate({userId, noteId},{
            $set: {briefingDoc: props.briefingDoc}
        },{new : true, runValidators: true});

        if(!updateBriefingDoc){
            throw new Error("Document not found or you don't have permission to update it");
        } 
        return updateBriefingDoc;
    }

    async updateFaq(props:{userId:string, noteId:Types.ObjectId, FAQ:string}) {
        const {userId, noteId} = props; 
        const updateFaq = await Doc.findOneAndUpdate({userId, noteId},{
            $set: {FAQ: props.FAQ}
        },{new : true, runValidators: true});

        if(!updateFaq){
            throw new Error("Document not found or you don't have permission to update it");
        } 
        return updateFaq;
    }

    async updateStudyGuide(props:{userId:string, noteId:Types.ObjectId, studyGuide:string}) {
        const {userId, noteId} = props; 
        const updateStudyGuide = await Doc.findOneAndUpdate({userId, noteId},{
            $set: {studyGuide: props.studyGuide}
        },{new : true, runValidators: true});

        if(!updateStudyGuide){
            throw new Error("Document not found or you don't have permission to update it");
        } 
        return updateStudyGuide;
    }

     async updateMindMap(props:{userId:string, noteId:Types.ObjectId, mindMap:string}) {
        const {userId, noteId} = props; 
        const updateMindMap = await Doc.findOneAndUpdate({userId, noteId},{
            $set: {mindMap: props.mindMap}
        },{new : true, runValidators: true});

        if(!updateMindMap){
            throw new Error("Document not found or you don't have permission to update it");
        } 
        return updateMindMap;
    } 

    async getSingleDoc(props:{userId?:string, noteId?:string}){
        const query: any = {};
        if (props.userId) query.userId = new Types.ObjectId(props.userId);
        if (props.noteId) query.noteId = new Types.ObjectId(props.noteId);
        const doc = await Doc.findOne(query);
        return doc;
    }
}
