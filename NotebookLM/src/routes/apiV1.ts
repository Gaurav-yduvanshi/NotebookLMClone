import { driveRoutes } from "@/app/http/controllers/drive/routes/driveRoutes";
import { createNoteRoute } from "@/app/http/controllers/notes/routes/createNoteRoutes";
import { updateNoteRoute } from "@/app/http/controllers/notes/routes/updateNoteRoute";
import { Router } from "express";
import { Express } from "express";
import { getNoteByIdRoute } from "@/app/http/controllers/notes/routes/getNoteByIdRoute";
import { getAllNotesRoute } from "@/app/http/controllers/notes/routes/getAllNoteRoutes";
import { summaryRoutes } from "@/app/http/controllers/notes/routes/summaryRoutes";
import { briefingRoutes } from "@/app/http/controllers/notes/routes/briefingDocRoute";
import { faqRoutes } from "@/app/http/controllers/notes/routes/getFaqRoutes";
import { studyGuideRoutes } from "@/app/http/controllers/notes/routes/getStudyGuideRoutes";
import { mindMapRoutes } from "@/app/http/controllers/notes/routes/mindMapRoutes";
import { chatRoute } from "@/app/http/controllers/notes/routes/chatRoute";


export function apiV1(app: Express, router: Router) {
    const driveRoute = driveRoutes(router);
    const createNote = createNoteRoute(router);
    const updateNote = updateNoteRoute(router);
    const getAllNotes = getAllNotesRoute(router);
    const summaryRoute = summaryRoutes(router);
    const briefingDoc = briefingRoutes(router)
    const faqRoute = faqRoutes(router)
    const studyGuideRoute = studyGuideRoutes(router);
    const mindMapRoute = mindMapRoutes(router);
    const getNoteById = getNoteByIdRoute(router);
    const chat = chatRoute(router);

    app.use('/api/v1/', driveRoute, createNote, updateNote, getAllNotes, summaryRoute, briefingDoc, faqRoute, studyGuideRoute, mindMapRoute, getNoteById, chat);
}