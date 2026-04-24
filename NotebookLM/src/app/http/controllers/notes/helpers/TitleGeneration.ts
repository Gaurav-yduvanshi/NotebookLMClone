import { AIMessage,HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PromptTemplate, ChatPromptTemplate } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import { Runnable } from "@langchain/core/runnables";

// Helper function to format documents as string
function formatDocumentAsString(docs: Document<Record<string, any>>[]): string {
    return docs.map((doc) => doc.pageContent).join("\n");
}

const generate_title_prompt = PromptTemplate.fromTemplate(
    `You are a helpful assistant that generates concise and clear titles. Based on the following content, generate a title that accurately reflects the main topic.
    Document Content: {document}
    Return valid json only using this shape: {{"title":"..."}}.
    Title:`
)



export async function generateTitle<T extends Runnable>(llm:T, doc:Document<Record<string, any>>[]) {
    const docToString = formatDocumentAsString(doc);
    const chain = generate_title_prompt.pipe(llm);

    const chainResult = await chain.invoke({document: docToString},{
        response_format:{
            type: 'json_object'
        }
    }as any);
    const result = JSON.parse(chainResult?.content as string);
    const generateTitle = result?.title;
    return generateTitle;
}
