import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PromptTemplate, ChatPromptTemplate } from "@langchain/core/prompts";
import { text } from "stream/consumers";
import dotenv from "dotenv";
import { Runnable } from "@langchain/core/runnables";

dotenv.config();
// import {ChatTogetherAI} from "@langchain/community/chat_models/together";

// const llm = new ChatGoogleGenerativeAI({
//     model: "gemini-2.5-flash-lite",
//     temperature: 0,
//     maxRetries: 2,
//     apiKey: process.env.GOOGLE_API_KEY,
// });


export async function generateMindMap<T extends Runnable>(llm: T, studyGuide: string): Promise<string> {
const prompt = PromptTemplate.fromTemplate(`
    you are an expert level tutor in the education department.Your task is to create a **MIND MAP** that enhances student's learning and retention of complex topics.The mind map should be visually appealing, organized, and comprehensive.Accuracy, clarity and comprehensive. Accuracy, clarity and relevance are core success factors.

    Follow these guidelines strictly:
    1. Begin by asking the user up to 5 pertinent questions to gather essential specifics for personlization. Include a ps note for newsletter subscription.
    2. Take a step back and think about the task thoroughly. Consider success factors, evaluation criteria, and the optimal output.
    3. Use the user's details and key references to craft the Mind Map.
    4. Present the Mind Map in ** valid MindElixir JSON format**, using short node names (1-5 words). Move long explanations into child nodes.
    5. Include core Prompt Engineering techniques if relevant (Zero-Shot,  Few-Shot, Chain-of-Thought, Tree-of-Thought, Step-back, Self-consistency).
    6. After generating the Mind Map, **evaluate your work** using a table with: Criteria, Rating (1-10), Reasons for Rating and Detailed Feedback.
    7. Provide **post-evaluation options** for refining the Mind Map.
    8. Append a **CHANGE LOG ** section for any revisions.
    9. Always conclude with: " Would you Like Me To Evaluate This Work and Provide Options to Improve It? Yes or No"?
    10. Ensure the structure strictly adheres to the MindElixir JSON schema provided below:
    11. Donot include any explanations or notes outside the MindElixir JSON structure.
         o= open curly brace
         c= close curly brace

         o
             "node data": o
                    "id": "root",
                    "topic": "Main Topic",
                    "children": [ 
                        o
                            "id": "<unique_id_1>",
                            "topic": "<subtopic_1>",
                            "children": [.....Recursive subtopics..... ]
                        c
                    ]
                c
            c


    Key References:
     - Tony Buzan, "The Mind Map Book" (2003)
     - Peter C. Brown et al., "Make It Stick" (2014)
     - Amy E. Herman, "Visual Intelligence" (2016)

     "Study Guide":
     
        {study_guide_text} 
     

     Output the Mind Map as JSON only, fully compatible with MindElixir.

    `)


const chain = prompt.pipe(llm);

async function main() {
    try {
        console.log("Starting mind-map generation...");
        
        const chainResult = await chain.invoke({
    study_guide_text: studyGuide

},{
    response_format: {
        type: "json_object",
    },
} as any)

// Add type checking before accessing content
let content: string = "";

const result = chainResult as any;
if (result && typeof result === "object") {
    if ("content" in result) {
        content = result.content as string;
    } else if ("text" in result) {
        content = result.text as string;
    } else {
        content = JSON.stringify(result);
    }
} else if (typeof result === "string") {
    content = result;
}

// Extract JSON from markdown code blocks if present
const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
const jsonString = jsonMatch ? jsonMatch[1].trim() : content;

const resultJson = JSON.parse(jsonString);
const mindMap = JSON.stringify(resultJson, null, 2);

console.log("✅ Mind Map Generated:\n", mindMap);

return mindMap;
    } catch (error) {
        console.error("Error in mind-map generation:", error);
        throw error;
    }
}

return await main()

}