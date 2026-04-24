// import pRetry from 'p-retry';
import { Document } from "@langchain/core/documents";
import { StateGraph, Annotation, Send } from "@langchain/langgraph";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

import dotenv from "dotenv";
import { Runnable } from '@langchain/core/runnables';

dotenv.config();
console.log("hello world")



export async function generateSummary<T extends Runnable>(llm:T, splitDocs:Document[]){
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


// Helper functions (replace the langchain imports)
function splitListofDocs(
    docs: Document[],
    lengthFunc: (docs: Document[]) => Promise<number>,
    tokenMax: number
): Document[][] {
    const docLists: Document[][] = [];
    let currentList: Document[] = [];
    let currentTokens = 0;

    for (const doc of docs) {
        const docTokens = Math.ceil(doc.pageContent.length / 4);
        if (currentTokens + docTokens > tokenMax && currentList.length > 0) {
            docLists.push(currentList);
            currentList = [doc];
            currentTokens = docTokens;
        } else {
            currentList.push(doc);
            currentTokens += docTokens;
        }
    }

    if (currentList.length > 0) {
        docLists.push(currentList);
    }

    return docLists;
}

async function collapseDocs(
    docs: Document[],
    reduceFunc: (input: Document[]) => Promise<string>
): Promise<string> {
    return reduceFunc(docs);
}

// const loader = new CheerioWebBaseLoader("https://lilianweng.github.io/posts/2023-03-15-prompt-engineering");
// console.log("1️⃣ Starting Cheerio loader...");
// const docs = await loader.load();
// console.log("2️⃣ Docs loaded:", docs.length);

// const textSplitter = new RecursiveCharacterTextSplitter({
//     chunkSize: 1000,
//     chunkOverlap: 200,
// });

// console.log("3️⃣ Splitting documents...");
// const splitDocs = await textSplitter.splitDocuments(docs);
// console.log("4️⃣ Split docs count:", splitDocs.length);

let tokenMax = 1000;

function approximateTokens(text: string): number {
    //Roughly 1 token = 4 characters (English text)
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

async function lengthFunction(documents: Document[]) {
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
        return 0;
    }
    const tokenCounts = documents
        .filter(doc => doc && doc.pageContent)
        .map(doc => approximateTokens(doc.pageContent));
    return tokenCounts.reduce((sum, count) => sum + count, 0);
}

const OverallState = Annotation.Root({
    contents: Annotation<string[]>,
    //Notice here we pass a reducer function.
    //This is because we want combine all the summaries we generate
    //from individual nodes back into one list. - this is essentially
    // the "reduce" part
    summaries: Annotation<string[]>({
        reducer: (state, update) => state.concat(update)
    }),
    collapsedSummaries: Annotation<Document[]>,
    finalSummary: Annotation<string>,
});



// This will be the state of the node that we will" map" all documents to in order to generate summaries

interface SummaryState {
    content: string;
}

// Here we generate a summary, given a document
const generateSummary = async (
    state: SummaryState
): Promise<{ summaries: string[] }> => {
    const mapPrompt = ChatPromptTemplate.fromMessages([
        ["user", "write a concise summary of the following: \n\n{context}"],
    ]);

    const execute = async () => {
        await sleep(2000); // Add delay before each request
        const prompt = await mapPrompt.invoke({ context: state.content });
        const response = await llm.invoke(prompt);
        return { summaries: [String(response.content)] };
    };

    const pRetry = (await import('p-retry')).default;
    return pRetry(execute, { retries: 5, minTimeout: 5000, maxTimeout: 30000 });
}


//Here we define the logic to map out ove the documents. we will use this an edge in the graph
const mapSummaries = (state: typeof OverallState.State) => {
    // we will return a list of 'Send' objects. Each 'Send' object consists of the name of a node in the
    // graph as well as the state to send to that node
    return state.contents.map((content) => new Send("generateSummary", { content }));
}


const collectSummaries = async (state: typeof OverallState.State) => {
    return {
        collapsedSummaries: state.summaries.map(
            (summary) => new Document({ pageContent: summary })
        )
    }
}



async function _reduce(input: string[]) : Promise<string> {
    const reducePrompt = ChatPromptTemplate.fromMessages([
        ["user", `
            The following is a set of summaries: {docs}
            Take these and distill it into a final, consolidated summary of the main themes.
        `]
    ]);

    const execute = async () => {
        await sleep(2000);
        const prompt = await reducePrompt.invoke({ docs: input });
        const response = await llm.invoke(prompt);
        return String(response.content);
    };

    const pRetry = (await import('p-retry')).default;
    return pRetry(execute, { retries: 5, minTimeout: 5000, maxTimeout: 30000 });
}

// Wrapper function to convert Documents to strings before reducing
async function _reduceDocuments(docs: Document[]): Promise<string> {
    const docStrings = docs.map(doc => doc.pageContent);
    return _reduce(docStrings);
}


//Add node to collapse summaries
const collapseSummaries = async (state: typeof OverallState.State) => {
    if (!state.collapsedSummaries || state.collapsedSummaries.length === 0) {
        return { collapsedSummaries: [] };
    }
    const docLists = splitListofDocs(
        state.collapsedSummaries,
        lengthFunction,
        tokenMax
    );
    const results: Document[] = [];
    for (const docList of docLists) {
        const collapsedText = await collapseDocs(docList, _reduceDocuments);
        results.push(new Document({ pageContent: collapsedText }));
    }
    return { collapsedSummaries: results };
};

// This represents a conditional edge int the graph that determines if we should collapse the summaries
// or not 

async function shouldCollapse(state: typeof OverallState.State) {
    let numTokens = await lengthFunction(state.collapsedSummaries);
    if (numTokens > tokenMax) {
        return "collapseSummaries";
    } else {
        return "generateFinalSummary";
    }
}

// here we will generate the final summary

const generateFinalSummary = async (state: typeof OverallState.State) => {
    // Extract pageContent from documents before passing to _reduce
    if (!state.collapsedSummaries || state.collapsedSummaries.length === 0) {
        return { finalSummary: "No summaries to generate final summary from." };
    }
    const summaryTexts = state.collapsedSummaries
        .filter(doc => doc && doc.pageContent)
        .map(doc => doc.pageContent);
    const response = await _reduce(summaryTexts);
    return { finalSummary: response };
}

//construct the graph

const graph = new StateGraph(OverallState)
    .addNode("generateSummary", generateSummary)
    .addNode("collectSummaries", collectSummaries)
    .addNode("collapseSummaries", collapseSummaries)
    .addNode("generateFinalSummary", generateFinalSummary)

    .addConditionalEdges("__start__", mapSummaries, ["generateSummary"])
    .addEdge("generateSummary", "collectSummaries")
    .addEdge("collectSummaries", "collapseSummaries")
    .addConditionalEdges("collectSummaries", shouldCollapse, [
        "collapseSummaries",
        "generateFinalSummary",
    ])
    .addConditionalEdges("collapseSummaries", shouldCollapse, [
        "collapseSummaries",
        "generateFinalSummary",
    ])
    .addEdge("generateFinalSummary", "__end__")
    
    const app = graph.compile();

    const finalSummary = await app.invoke({contents: splitDocs.map((doc) => doc.pageContent)});
    // let finalSummary = null;

    // for await(const step of await app.stream(
    // {contents:splitDocs.map((doc)=> doc.pageContent)},
    // {recursionLimit:10}
    // )){
    //     console.log(Object.keys(step));
    //     if(step.hasOwnProperty('generateFinalSummary')){
    //         finalSummary = step.generateFinalSummary;
    //     }
    // }

    console.log("Final Summary: ", finalSummary);
    return finalSummary.finalSummary;
}




