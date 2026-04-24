import { Router } from "express";
import { getNoteById } from "../getNoteById";

export function getNoteByIdRoute(router: Router) {
    router.get("/notes/:id", getNoteById);
    return router;
}
