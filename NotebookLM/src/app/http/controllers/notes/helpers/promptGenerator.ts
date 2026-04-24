import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PromptTemplate, ChatPromptTemplate } from "@langchain/core/prompts";
// import { formatDocumentAsString } from "langchain/util/document";
import { Document } from "@langchain/core/documents";
import { Runnable } from "@langchain/core/runnables";
import { title } from "process";

export async function generatePrompt<T extends Runnable>(llm: T, title: string) {

    const prompt_image_generator = PromptTemplate.fromTemplate(
        `You are an expert prompt engineer for AI image generator. your task is to take the user's 
        input, which is a document title, and create a single, concise prompt to generate a logo for it.
         
        The prompt you create must instruct the image generator to produce:
        * A **minimalist and modern vector icon** that visually represnt the title.
        * The style should be **flat design** with clean simple lines.
        * The final image must be **only the logo with a tranparent background**.
        
        Return valid json only using this shape: {{"prompt":"..."}}.
        Here is the user's input: **{input}**
        `
    );

    const chain = prompt_image_generator.pipe(llm);
    const chainResult = await chain.invoke({input:title},{
        response_format:{
            type: 'json_object'
        } 
    }as any);
    const result = JSON.parse(chainResult?.content as string);
    return result?.prompt;
}

