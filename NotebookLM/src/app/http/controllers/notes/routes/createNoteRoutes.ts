import multer from "multer";
import path from 'path';
import fs from 'fs';
import { Response,Router } from "express";
import { cwd } from "process";
import { loadDocument } from "../loaders/loader";
import { createNote } from "../createNote";

const currentDir = cwd();

//Ensure upload directory exists
const uploadDir = path.join(currentDir, "public", "uploads");
if(!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, {recursive:true});
}

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename:(req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random()*1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const documentFileFilter = (req: any, file:any, cb:(error:any, acceptFile: boolean)=>void) => {
    const allowedTypes = /pdf|doc|docx|html|csv|txt/;
    const isDoc = allowedTypes.test(file.mimetype) || allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if(isDoc){
        cb(null, true);
    }else{
        cb(new Error("Invalid document type. only documents are allowed (pdf, doc, docx, html, csv, txt)"), false);
    }
};

const upload = multer({
    storage,
    fileFilter: documentFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

export function createNoteRoute(router: Router) {
    // router.post("/upload-document", upload.single("doc"), createNote);
    router.post("/notes", upload.single("doc"), createNote)
    return router;
}