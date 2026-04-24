import { Router } from "express";
import { handleChat } from "../chat";

export function chatRoute(router: Router) {
    router.post("/notes/chat", handleChat);
    return router;
}
