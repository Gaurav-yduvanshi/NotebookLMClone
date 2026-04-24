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

// ============ Load and split webpage ============

// const loader = new CheerioWebBaseLoader("https://lilianweng.github.io/posts/2023-03-15-prompt-engineering");
// const docs = await loader.load();

// const tokenMax = 3000;
// const textSplitter = new RecursiveCharacterTextSplitter({
//   chunkSize:3000,
//   chunkOverlap: 400,
// });
// const splitDocs = await textSplitter.splitDocuments(docs);

// // ============ Initialize model ============

// const llm = new ChatGoogleGenerativeAI({
//   model: "gemini-2.5-flash-lite",
//   temperature: 0,
//   maxRetries: 2,
//   apiKey: process.env.GOOGLE_API_KEY,
// });

// ============ Utility functions ============
export async function generteFaq<T extends Runnable>(llm: T, splitDocs: Document[]){

let tokenMax = 1000;
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
});

// ============ Interfaces ============
interface StudyGuideState {
  content: string;
}
interface StudyGuideResult {
  studyGuides: string[];
}

// ============ Map Function ============

const generateFaqGuideChunk = async (state: StudyGuideState): Promise<StudyGuideResult> => {
  const mapPrompt = ChatPromptTemplate.fromMessages([
    ["user",
      `create a set of FAQs (questions and answers) from the following text. 
      Each FAQ should include:
      - A clear and concise question
      - A concise, accurate answer 
      format as a list of Q&A.\n\n{context}`],
  ]);

  const execute = async () => {
    const prompt = await mapPrompt.invoke({ context: state.content });
    const response = await llm.invoke(prompt);
    return { studyGuides: [String(response.content)] };
  };

  const pRetry = (await import("p-retry")).default;
  return pRetry(execute, {
    retries: 8,
    minTimeout: 1000,
    maxTimeout: 4000,
    factor: 2,
    randomize: true,
  });
};

// ============ Map Logic ============

const mapgenerateFaqGuides = async (state: typeof OverallState.State) => {
  return state.contents.map(
    (content) => new Send("generateFaqGuideChunk", { content })
  );
};

// ============ Collect all chunks ============

const collectGenerateFaqGuides = async (state: typeof OverallState.State) => {
  return {
    collapsedStudyGuide: state.studyGuides.map(
      (guide) => new Document({ pageContent: guide })
    ),
  };
};

// ============ Reduce Logic ============

async function reduceGenerateFaqGuides(input: Document[]) {
  const reducePrompt = ChatPromptTemplate.fromMessages([
    ["user", `
      The following are FAQ chunks:
      {docs}
      Distill these into a single cohesive FAQ document, maintaining main ideas, key takeways and actionable insights.
      size of document should be around 200 words or less than 1000 characters.
      `]
  ]);

  const prompt = await reducePrompt.invoke({ docs: input });
  const response = await llm.invoke(prompt);
  return String(response.content);
}

// ============ Collapse Logic ============

const collapseGenerateFaqGuides = async (state: typeof OverallState.State) => {
  const docBatches = splitListofDocs(
    state.collapsedStudyGuide,
    lengthFunction,
    tokenMax
  );
  const results = [];
  for (const batch of docBatches) {
    const collapsed = await collapseDocs(batch, reduceGenerateFaqGuides);
    results.push(new Document({ pageContent: collapsed }));
  }
  console.log("results", results.length);
  console.log("_____________________________________________________")
  console.log(results[0].pageContent);
  return { collapsedStudyGuide: results };
};

// ============ Conditional Logic ============

async function shouldCollapse(state: typeof OverallState.State) {
  const numTokens = await lengthFunction(state.collapsedStudyGuide);
  if (numTokens > tokenMax) {
    return "collapseGenerateFaqGuides";
  } else {
    return "generateFinalGenerateFaqGuide";
  }
}

// ============ Final Guide Generation ============

const generateFinalGenerateFaqGuide = async (state: typeof OverallState.State) => {
  const finalGuide = await reduceGenerateFaqGuides(state.collapsedStudyGuide);
  return { finalStudyGuide: finalGuide };
};

// ============ Graph Construction ============

const graph = new StateGraph(OverallState)
  .addNode("generateFaqGuideChunk", generateFaqGuideChunk)
  .addNode("collectGenerateFaqGuides", collectGenerateFaqGuides)
  .addNode("collapseGenerateFaqGuides", collapseGenerateFaqGuides)
  .addNode("generateFinalGenerateFaqGuide", generateFinalGenerateFaqGuide)
  .addConditionalEdges("__start__", mapgenerateFaqGuides, ["generateFaqGuideChunk"])
  .addEdge("generateFaqGuideChunk", "collectGenerateFaqGuides")
  .addConditionalEdges("collectGenerateFaqGuides", shouldCollapse, ["collapseGenerateFaqGuides", "generateFinalGenerateFaqGuide"])
  .addConditionalEdges("collapseGenerateFaqGuides", shouldCollapse, ["collapseGenerateFaqGuides", "generateFinalGenerateFaqGuide"])
  .addEdge("generateFinalGenerateFaqGuide", "__end__");

const app = graph.compile();

// ============ Run Graph ============

let finalFaq = null;

for await (const step of await app.stream(
  { contents: splitDocs.map((doc) => doc.pageContent) },
  { recursionLimit: 50 }
)) {
  console.log(Object.keys(step));
  if (step.hasOwnProperty("generateFinalGenerateFaqGuide")) {
    finalFaq = step.generateFinalGenerateFaqGuide;
  }
}

console.log("✅ Final Study Guide:\n", finalFaq);

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
    const docTokens = Math.ceil(doc.pageContent.length / 5);
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

return finalFaq?.finalStudyGuide || "";
}