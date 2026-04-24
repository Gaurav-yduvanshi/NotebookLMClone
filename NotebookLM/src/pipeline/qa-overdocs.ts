import { END, START, StateGraph, Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PromptTemplate, ChatPromptTemplate } from "@langchain/core/prompts";
import z from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { queryVectorDB } from "./retriever.ts";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Document } from "@langchain/core/documents";
import { reciprocalRankFusion } from "./RRF.ts";
import { extractMessage, generateResponseFormatter, gradeDocResponseFormatter, questionResponseFormatter, TransformResponseFormatter } from "../util/index.ts";
import { generate_question_prompt, grade_doc_prompt, response_generator_prompt, transform_query_prompt } from "../prompt/prompts.ts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { TavilySearch } from "@langchain/tavily";


// Helper function to format documents as string
const formatDocumentsAsString = (docs: Document[]): string => {
    return docs.map((doc, index) => `Document ${index + 1}:\n${doc.pageContent}`).join("\n\n");
};

const llm = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0,
  maxRetries: 2,
  apiKey: process.env.GOOGLE_API_KEY,

});

// nextNode, retrievedDoc, filteredDoc, transformQuery
const StateAnnotation = Annotation.Root({
    // ...MessagesAnnotation,spec,

    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
    }),

    nextNode: Annotation<string>({
        reducer: (previousVal, nextVal) => previousVal ?? nextVal ?? "",
    }),

    newQuery: Annotation<string>({
        reducer: (previousVal, nextVal) => previousVal ?? nextVal ?? "",
    }),

    generateQuestions: Annotation<string[]>({
        default: () => [],
        reducer: (previousVal, nextVal) => previousVal ?? nextVal ?? [],
    }),

    retrievedDoc: Annotation<Document[]>({
        default: () => [],
        reducer: (previousVal, nextVal) => previousVal.concat(nextVal),
    }),

    filteredDoc: Annotation<Document[]>({
        default: () => [],
        reducer: (previousVal, nextVal) => previousVal.concat(nextVal),
    }),
});

//create the graph
const RetrieverNode = async (state: typeof StateAnnotation.State) => {
    const lastMessage = extractMessage(state, "human");
    const query = lastMessage?.content || "";

    const generateQuestionPrompt = await generate_question_prompt.invoke({
        question: query,
    })

    const llmQuestionResult = await llm.invoke([{
        role: "user",
        content: generateQuestionPrompt.toString()
    }], questionResponseFormatter)

    console.log("Reframed Questions:", llmQuestionResult);
    const parsedResult = JSON.parse(llmQuestionResult?.content as string);
    const questions = parsedResult?.questions as string[];

    const allRetrievedDocs = [] as Document[][];

    for (const question of questions) {
        const result = await queryVectorDB(question);
        allRetrievedDocs.push(result);
    }
    const fusedDocs = reciprocalRankFusion(allRetrievedDocs);

    return {
        retrievedDoc: fusedDocs,
        generateQuestions: questions,
    };


};

const gradeDocNode = async (state: typeof StateAnnotation.State) => {
    console.log("State.retrievedDoc length:", state.retrievedDoc.length);
    const lastMessage = extractMessage(state, "human");
    const allRetrievedDoc = state.retrievedDoc;

    const allFilteredDoc: Document[] = [];

    for (const retrievedItem of allRetrievedDoc) {
        // retrievedItem is already a Document
        const doc = retrievedItem;
        const pageContent = doc?.pageContent;

        // Create the prompt string directly
        const promptText = await grade_doc_prompt.format({
            question: lastMessage?.content,
            context: pageContent,
        });

        console.log("Prompt text:\n", promptText);

        // Invoke LLM directly without the formatter in the pipe
        const chainResult = await llm.invoke(promptText);

        const content = typeof chainResult.content === "string"
            ? chainResult.content
            : JSON.stringify(chainResult.content);

        console.log("Raw grading result:", content);

        // Try to parse the JSON
        let score: "yes" | "no" = "no";
        try {
            const parsedResults = JSON.parse(content);
            score = parsedResults?.binaryscore as "yes" | "no";
        } catch (e) {
            console.error("Failed to parse JSON:", content);
        }

        console.log("Score:", score);

        if (score === "yes") {
            allFilteredDoc.push(new Document({
                pageContent: doc.pageContent,
                metadata: doc.metadata || {},
            }));
        }
    }

    console.log(`Filtered ${allFilteredDoc.length} documents out of ${allRetrievedDoc.length}`);

    return {
        filteredDoc: allFilteredDoc,
    };
}

const transformQuery = async (state: typeof StateAnnotation.State) => {
    const lastMessage = extractMessage(state, "human");

    const chain = transform_query_prompt.pipe(llm);
    const betterQuestionResponse = await chain.invoke({ question: lastMessage?.content }, TransformResponseFormatter);

    // Parse the response content if it's a string
    const parsedResponse = typeof betterQuestionResponse.content === "string"
        ? JSON.parse(betterQuestionResponse.content)
        : betterQuestionResponse.content;

    const betterQuestion = parsedResponse?.improved_question as string;

    return {
        newQuery: betterQuestion,
    }
}

const webSearch = async (state: any) => {
    console.log("state.newQuery", state.newQuery)
    try {
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: process.env.TAVILY_API_KEY,
                query: state.newQuery,
                max_results: 4,
            }),
        });

        if (!response.ok) {
            console.error(`API Error: ${response.status} ${response.statusText}`);
            return { web_results: [] };
        }

        const docs = await response.json();

        if (!docs || !docs.results) {
            console.error("No results returned from API");
            return { web_results: [] };
        }

        const webResult = docs.results.map((doc: any) => ({
            pageContent: doc.content,
            metadata: { source: doc.url, title: doc.title },
        }));

        return { web_results: webResult };
    } catch (error) {
        console.error("Web search error:", error);
        return { web_results: [] };
    }
};

const generate = async (state: typeof StateAnnotation.State) => {
    const lastMessage = extractMessage(state, "human");
    const docToString = formatDocumentsAsString(state.filteredDoc)

    const generatorResPrompt = await response_generator_prompt.invoke({
        original_question: lastMessage?.content,
        questions: state.generateQuestions.join(", \n"),
        retrieved_docs: docToString,
    })

    const aiResponse = await llm.invoke([{
        role: "user",
        content: generatorResPrompt.toString()  // Changed here
    }], generateResponseFormatter)

    const result = JSON.parse(aiResponse?.content as string) as { reasoning: string, answer: string };

    console.log("AI Reasoning:::: ", result.reasoning);
    console.log("Final Answer:", aiResponse);

    return {
        messages: [new AIMessage(result.answer)]
    }
}

const router = (state: typeof StateAnnotation.State) => {
    if (state.filteredDoc.length === 0) {
        console.log("No documents passed grading, attempting web search...");
        return "transformQuery";
    }
    return "generate";
}

const builder = new StateGraph(StateAnnotation)
    .addNode("RetrieverNode", RetrieverNode)
    .addNode("gradeDocNode", gradeDocNode)
    .addNode("transformQuery", transformQuery)
    .addNode("webSearch", webSearch)
    .addNode("generate", generate)

    .addEdge(START, "RetrieverNode")
    .addEdge("RetrieverNode", "gradeDocNode")
    .addConditionalEdges("gradeDocNode", router)
    .addEdge("transformQuery", "webSearch")
    .addEdge("webSearch", "generate")
    .addEdge("generate", END);

const graph = builder.compile();
//invoke the graph
async function main() {
    try {
        console.log("Starting QA over docs pipeline...");
        const baseResult = await graph.invoke({
            messages: [new HumanMessage({ content: "What is Artifical Intelligence in much more detail than this document?" })],
        });

        console.log("Final Result:", JSON.stringify(baseResult, null, 2));
    } catch (error) {
        console.error("Error during pipeline execution:", error);
        process.exit(1);
    }
}

main();