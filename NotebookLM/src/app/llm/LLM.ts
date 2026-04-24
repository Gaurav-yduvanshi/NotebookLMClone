import { ChatOpenAI } from "@langchain/openai";

export class LLM{
    private static instance: ChatOpenAI;

    //private constructor to prevent direct instantiation
    private constructor(){}

    public static getInstance(): ChatOpenAI{
        if(!LLM.instance){
            if(!process.env.OPENAI_API_KEY){
                throw new Error("OPENAI_API_KEY is not set in environment variables");
            }
            const model = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
            LLM.instance = new ChatOpenAI({
                model,
                temperature: 0.7,
                maxRetries: 2,
                apiKey: process.env.OPENAI_API_KEY
            });
        }
        return LLM.instance;
    }
}