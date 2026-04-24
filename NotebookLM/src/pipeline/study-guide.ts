import { Document } from "@langchain/core/documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";
import { Annotation, StateGraph, Send } from "@langchain/langgraph";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import dotenv from "dotenv";

dotenv.config();

// ============ Utility functions ============





// ============ Load and split webpage ============
// (async () => {
//   const loader = new CheerioWebBaseLoader("https://lilianweng.github.io/posts/2023-03-15-prompt-engineering");
//   const docs = await loader.load();

//   const tokenMax = 1000;
//   const textSplitter = new RecursiveCharacterTextSplitter({
//     chunkSize: 1000,
//     chunkOverlap: 200,
//   });
//   const splitDocs = await textSplitter.splitDocuments(docs);

//   // ============ Initialize model ============

//   const llm = new ChatGoogleGenerativeAI({
//     model: "gemini-2.0-flash-lite",
//     temperature: 0,
//     maxRetries: 2,
//     apiKey: process.env.GOOGLE_API_KEY,
//   });

export async function generateStudyGuide<T extends Runnable>(llm: T, splitDocs:Document[]){
  const tokenMax = 4000;
  const maxCollapseIterations = 4;

  const approximateTokens = (text: string): number => {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  };

  const splitListofDocs = (
    docs: Document[],
    lengthFunc: (docs: Document[]) => Promise<number>,
    tokenMax: number
  ): Document[][] => {
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
  };

  const collapseDocs = async (
    docs: Document[],
    reduceFunc: (input: Document[]) => Promise<string>
  ): Promise<string> => {
    return reduceFunc(docs);
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

  // ============ Interfaces ============
  interface StudyGuideState {
    content: string;
  }
  interface StudyGuideResult {
    studyGuides: string[];
  }

  const lengthFunction = async (documents: Document[]) => {
    const tokenCounts = documents.map(doc => approximateTokens(doc.pageContent));
    return tokenCounts.reduce((sum, count) => sum + count, 0);
  };

  // ============ Map Function ============

  const generateStudyGuideChunk = async (state: StudyGuideState): Promise<StudyGuideResult> => {
    const mapPrompt = ChatPromptTemplate.fromMessages([
      ["user",
        `create Structured study notes for the following text. Include:
        - key concepts / definitions
        - Examples and illustrations
        - Important points
        format as bullet points.\n\n{context}`],
    ]);

    const prompt = await mapPrompt.invoke({ context: state.content });
    const response = await llm.invoke(prompt);
    return { studyGuides: [String(response.content)] };
  };

  // ============ Map Logic ============

  const mapStudyGuides = async (state: typeof OverallState.State) => {
    return state.contents.map(
      (content) => new Send("generateStudyGuideChunk", { content })
    );
  };

  // ============ Collect all chunks ============

  const collectStudyGuides = async (state: typeof OverallState.State) => {
    return {
      collapsedStudyGuide: state.studyGuides.map(
        (guide) => new Document({ pageContent: guide })
      ),
      collapseIterations: 0,
    };
  };

  // ============ Reduce Logic ============

  const reduceStudyGuides = async (input: Document[]) => {
    const reducePrompt = ChatPromptTemplate.fromMessages([
      ["user", `
        The following are study guide chunks:
        {docs}
        Distill these into a comprehensive study guide, maintaining key concepts, examples, and important points. Format as bullet points.`]
    ]);

    const prompt = await reducePrompt.invoke({ docs: input });
    const response = await llm.invoke(prompt);
    return String(response.content);
  };

  // ============ Collapse Logic ============

  const collapseStudyGuides = async (state: typeof OverallState.State) => {
    const docBatches = splitListofDocs(
      state.collapsedStudyGuide,
      lengthFunction,
      tokenMax
    );
    const results = [];
    for (const batch of docBatches) {
      const collapsed = await collapseDocs(batch, reduceStudyGuides);
      results.push(new Document({ pageContent: collapsed }));
    }
    return {
      collapsedStudyGuide: results,
      collapseIterations: (state.collapseIterations ?? 0) + 1,
    };
  };

  // ============ Conditional Logic ============

  const shouldCollapse = async (state: typeof OverallState.State) => {
    if ((state.collapseIterations ?? 0) >= maxCollapseIterations) {
      return "generateFinalStudyGuide";
    }

    // If we are down to a single document, finalize to avoid repeated no-op reductions.
    if ((state.collapsedStudyGuide?.length ?? 0) <= 1) {
      return "generateFinalStudyGuide";
    }

    const numTokens = await lengthFunction(state.collapsedStudyGuide);
    if (numTokens > tokenMax) {
      return "collapseStudyGuides";
    } else {
      return "generateFinalStudyGuide";
    }
  };

  // ============ Final Guide Generation ============

  const generateFinalStudyGuide = async (state: typeof OverallState.State) => {
    const finalGuide = await reduceStudyGuides(state.collapsedStudyGuide);
    return { finalStudyGuide: finalGuide };
  };

  // ============ Graph Construction ============

  const graph = new StateGraph(OverallState)
    .addNode("generateStudyGuideChunk", generateStudyGuideChunk)
    .addNode("collectStudyGuides", collectStudyGuides)
    .addNode("collapseStudyGuides", collapseStudyGuides)
    .addNode("generateFinalStudyGuide", generateFinalStudyGuide)
    .addConditionalEdges("__start__", mapStudyGuides, ["generateStudyGuideChunk"])
    .addEdge("generateStudyGuideChunk", "collectStudyGuides")
    .addConditionalEdges("collectStudyGuides", shouldCollapse, ["collapseStudyGuides", "generateFinalStudyGuide"])
    .addConditionalEdges("collapseStudyGuides", shouldCollapse, ["collapseStudyGuides", "generateFinalStudyGuide"])
    .addEdge("generateFinalStudyGuide", "__end__");

  const app = graph.compile();

  // ============ Run Graph ============

  let finalStudyGuide = null;

  for await (const step of await app.stream(
    { contents: splitDocs.map((doc) => doc.pageContent) },
    { recursionLimit: 50 }
  )) {
    console.log(Object.keys(step));
    if (step.hasOwnProperty("generateFinalStudyGuide")) {
      finalStudyGuide = step.generateFinalStudyGuide;
    }
  }

  console.log("✅ Final Study Guide:\n", finalStudyGuide);

  return finalStudyGuide?.finalStudyGuide || "";
}