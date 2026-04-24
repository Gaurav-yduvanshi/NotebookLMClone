import { Document } from "@langchain/core/documents";
import { StateGraph, Annotation, Send } from "@langchain/langgraph";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import dotenv from "dotenv";
// import pRetry from "p-retry";
import { Runnable } from "@langchain/core/runnables";
dotenv.config();

// ============ Helper setup ============

// Delay helper



// // ============ Load and split webpage ============

// const loader = new CheerioWebBaseLoader("https://lilianweng.github.io/posts/2023-03-15-prompt-engineering");
// const docs = await loader.load();


// const textSplitter = new RecursiveCharacterTextSplitter({
//   chunkSize: 1000,
//   chunkOverlap: 200,
// });
// const splitDocs = await textSplitter.splitDocuments(docs);

// ============ Initialize model ============

// const llm = new ChatGoogleGenerativeAI({
//   model: "gemini-2.5-flash-lite",
//   temperature: 0,
//   maxRetries: 2,
//   apiKey: process.env.GOOGLE_API_KEY,
// });

// const llm = new Ollama({
//   model: "gemma3:1b", // Default value
//   temperature: 0,
//   maxRetries: 2,
//   // other params...
// });

// ============ Utility functions ============

export async function generateBriefingDoc<T extends Runnable>(llm: T, splitDocs: Document[]) {
  const tokenMax = 4000;
  const maxCollapseIterations = 4;
   const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
function approximateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

async function lengthFunction(documents: Document[]) {
  const tokenCounts = documents.map(doc => approximateTokens(doc.pageContent));
  return tokenCounts.reduce((sum, count) => sum + count, 0);
}

// ============ Define State ============

const OverallState = Annotation.Root({
  contents: Annotation<string[]>,
  studyGuides: Annotation<string[]>({
    reducer: (state, update) => state.concat(update)
  }),
  collapsedStudyGuide: Annotation<Document[]>,
  finalStudyGuide: Annotation<string>,
  collapseIterations: Annotation<number>({
    default: () => 0,
    reducer: (_state, update) => update,
  }),
});

const extractLLMText = (response: any): string => {
  if (!response) return "";
  if (typeof response === "string") return response;
  if (typeof response === "object" && "content" in response) {
    const content = (response as any).content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part === "object" && "text" in part) {
            return String((part as any).text ?? "");
          }
          return "";
        })
        .join(" ")
        .trim();
    }
  }
  return String(response);
};

// ============ Interfaces ============
//state for a single chunk
interface StudyGuideState {
  content: string;
}
interface StudyGuideResult {
  studyGuides: string[];
}

// ============ Map Function ============

const briefingDocGuideChunk = async (state: StudyGuideState): Promise<StudyGuideResult> => {
  const mapPrompt = ChatPromptTemplate.fromMessages([
    ["user",
      `create proffessional briefing document for the following text. Include:
      - summary of main ideas
      - key takeways
      - actionable insights or recommendations
      format as concise, clear paragraph.\n\n{context}`],
  ]);

  const execute = async () => {
    await sleep(100);
    const prompt = await mapPrompt.invoke({ context: state.content });
    const response = await llm.invoke(prompt);
    return { studyGuides: [extractLLMText(response)] };
  };

  const pRetry = (await import("p-retry")).default;
  return pRetry(execute, {
    retries: 2,
    minTimeout: 1000,
    maxTimeout: 4000,
    factor: 2,
    randomize: true,
  });
};

// ============ Map Logic ============

const mapBriefingDocGuides = async (state: typeof OverallState.State) => {
  return state.contents.map(
    (content) => new Send("briefingDocGuideChunk", { content })
  );
};

// ============ Collect all chunks ============

const collectBriefingDocGuides = async (state: typeof OverallState.State) => {
  return {
    collapsedStudyGuide: state.studyGuides.map(
      (guide) => new Document({ pageContent: guide })
    ),
    collapseIterations: 0,
  };
};

// ============ Reduce Logic ============

async function reduceBriefingDocGuides(input: Document[]) {
  const reducePrompt = ChatPromptTemplate.fromMessages([
    ["user", `
      The following are briefing chunks:
      {docs}
      Distill these into a single cohesive briefing document, maintaining main ideas, key takeways and actionable insights.`]
  ]);

  const prompt = await reducePrompt.invoke({ docs: input });
  const response = await llm.invoke(prompt);
  return extractLLMText(response);
}

// ============ Collapse Logic ============

const collapseBriefingDocGuides = async (state: typeof OverallState.State) => {
  const docBatches = splitListofDocs(
    state.collapsedStudyGuide,
    lengthFunction,
    tokenMax
  );
  const results = [];
  for (const batch of docBatches) {
    const collapsed = await collapseDocs(batch, reduceBriefingDocGuides);
    results.push(new Document({ pageContent: collapsed }));
  }
  return {
    collapsedStudyGuide: results,
    collapseIterations: (state.collapseIterations ?? 0) + 1,
  };
};

// ============ Conditional Logic ============

async function shouldCollapse(state: typeof OverallState.State) {
  if ((state.collapseIterations ?? 0) >= maxCollapseIterations) {
    return "generateFinalBriefingDocGuide";
  }

  if ((state.collapsedStudyGuide?.length ?? 0) <= 1) {
    return "generateFinalBriefingDocGuide";
  }

  const numTokens = await lengthFunction(state.collapsedStudyGuide);
  if (numTokens > tokenMax) {
    return "collapseBriefingDocGuides";
  } else {
    return "generateFinalBriefingDocGuide";
  }
}

// ============ Final Guide Generation ============

const generateFinalBriefingDocGuide = async (state: typeof OverallState.State) => {
  const finalGuide = await reduceBriefingDocGuides(state.collapsedStudyGuide);
  return { finalStudyGuide: finalGuide };
};

// ============ Graph Construction ============

const graph = new StateGraph(OverallState)
  .addNode("briefingDocGuideChunk", briefingDocGuideChunk)
  .addNode("collectBriefingDocGuides", collectBriefingDocGuides)
  .addNode("collapseBriefingDocGuides", collapseBriefingDocGuides)
  .addNode("generateFinalBriefingDocGuide", generateFinalBriefingDocGuide)
  .addConditionalEdges("__start__", mapBriefingDocGuides, ["briefingDocGuideChunk"])
  .addEdge("briefingDocGuideChunk", "collectBriefingDocGuides")
  .addConditionalEdges("collectBriefingDocGuides", shouldCollapse, ["collapseBriefingDocGuides", "generateFinalBriefingDocGuide"])
  .addConditionalEdges("collapseBriefingDocGuides", shouldCollapse, ["collapseBriefingDocGuides", "generateFinalBriefingDocGuide"])
  .addEdge("generateFinalBriefingDocGuide", "__end__");

const app = graph.compile();

// ============ Run Graph ============

let finalBriefingDoc = null;

for await (const step of await app.stream(
  { contents: splitDocs.map((doc) => doc.pageContent) },
  { recursionLimit: 50 }
)) {
  console.log(Object.keys(step));
  if (step.hasOwnProperty("generateFinalBriefingDocGuide")) {
    finalBriefingDoc = step.generateFinalBriefingDocGuide;
  }
}

console.log("✅ Final Briefing Document:\n", finalBriefingDoc);

return finalBriefingDoc?.finalStudyGuide || "";
}

// ============ Helpers ============

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

