import { NextFunction, Request, Response } from "express";
import { NoteRepository } from "./repository/NoteRepository";

export async function getNoteById(req: Request, res: Response, next: NextFunction) {
    try {
        const id = req.params.id;
        const noteRepo = NoteRepository.getInstance();
        const note = await noteRepo.getNoteById(id);

        if (!note) {
            return res.status(404).json({ message: "Note not found" });
        }

        return res.status(200).json(note);
    } catch (error) {
        next(error);
    }
}
