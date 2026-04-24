import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import {CohereEmbeddings} from "@langchain/cohere";
import {PineconeStore} from "@langchain/pinecone";
import {Pinecone as PineconeClient} from "@pinecone-database/pinecone";
import {CheerioWebBaseLoader} from "@langchain/community/document_loaders/web/cheerio";
import dotenv from "dotenv";

dotenv.config();

export async function webFileEmbedding(url: string){
    const loader = new CheerioWebBaseLoader(url);
    const docs = await loader.load();

    // chunkoverlap : we use it in order to preverse the meaning of the chunks
    const textsplitter = new RecursiveCharacterTextSplitter({
        chunkSize:500,
        chunkOverlap:200,
    });

    const allSplits = await textsplitter.splitDocuments(docs);

    // step 3: embeddings

    const embeddings = new CohereEmbeddings({
        model: "embed-english-v3.0",
        apiKey: process.env.COHERE_API_KEY,
    });

    // step 4: store in pinecone

    const pinecone = new PineconeClient({
        apiKey: process.env.PINECONE_API_KEY as string,
    });
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX as string);

    const vectorStore = new PineconeStore(embeddings,{
        pineconeIndex: pineconeIndex,
        maxConcurrency:5,
    });

    await vectorStore.addDocuments(allSplits);
    console.log("Document added to pinecone vector store");

}

async function main() {
    await webFileEmbedding("https://en.wikipedia.org/wiki/Artificial_intelligence");
}

if (require.main === module) {
    void main();
}