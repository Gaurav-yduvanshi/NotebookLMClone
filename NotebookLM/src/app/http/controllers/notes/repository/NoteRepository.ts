import agenda from "@/app/bootstrap/agenda/agenda";
import { generateToken, signAccessToken, signRefreshToken } from "@/app/helper/jwt";
import { Note } from "@/app/models/noteSchema";
// import { User,  } from "@/app/models/userSchema";
import { GoogleUserType } from "@/types/user-types";
import { create } from "domain";
import { access } from "fs";



export class NoteRepository {
    private static instance: NoteRepository;

// Singleton pattern to ensure only one instance of NoteRepository
    public static getInstance(): NoteRepository {
        if (!NoteRepository.instance) {
            NoteRepository.instance = new NoteRepository();
        }

        return NoteRepository.instance;
    }


    

    async createNote(noteProps:{title:string, image:string, userId:string},
        imageProps:{generateImagePrompt:string, uploadDir: string, randomName:string}
    ) {
        

        const note = new Note({
            ...noteProps
        });

        const newNote = await note.save();

        // Schedule background job for image generation
        agenda.now("generateImage", {
            noteId: newNote.toObject()._id,
            ...imageProps
        })
        return newNote.toObject();
    }

    async updateNotes({ id, title }: { id: string; title: string }) {
        const updateNote = await Note.findByIdAndUpdate(id, { title }, { new: true, runValidators: true });
        return updateNote;
    }

    async getAllNotes({
        search = "",
        page = 1,
        limit = 10,
      }: {
        search?: string;
        page?: number;
        limit?: number;
      }) {
        const skip = (page - 1) * limit;
        //Build Filter
        const filter: any = {};
        if(search){
            filter.$or=[
                {title:{$regex:search, $options:"i"}}
            ]
        }
    
        const [notes, total] = await Promise.all([
            Note.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({createdAt: -1})// newest first
            .lean(),
            Note.countDocuments(filter)
        ]);
    
        return {
            notes,
            pagination:{
                total,
                page,
                limit,
                totalPages: Math.ceil(total/limit),
            },
        }
    }

    async getNoteById(id: string) {
        const note = await Note.findById(id).lean();
        return note;
    }
}
