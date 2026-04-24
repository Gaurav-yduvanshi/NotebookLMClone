import { Router } from "express";
import { getAllNotes } from "../getAllNotes";

export function getAllNotesRoute(router: Router) {
    router.get("/notes", getAllNotes);
    return router;
}