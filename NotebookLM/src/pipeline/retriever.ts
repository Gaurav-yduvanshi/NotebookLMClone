import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import {CohereEmbeddings, CohereRerank} from "@langchain/cohere";
import {PineconeStore} from "@langchain/pinecone";
import {Pinecone as PineconeClient} from "@pinecone-database/pinecone";
// import {CheerioWebBaseLoader} from "@langchain/community/document_loaders/web/cheerio";
import dotenv from "dotenv";



dotenv.config();

export async function queryVectorDB(query:string){
    const embeddings = new CohereEmbeddings({
        model: "embed-english-v3.0",
        apiKey: process.env.COHERE_API_KEY,
    });

    const pinecone = new PineconeClient({
        apiKey: process.env.PINECONE_API_KEY as string,
    });
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX as string);

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings,{
        pineconeIndex: pineconeIndex,
        maxConcurrency:5,
    });



    // const result = await vectorStore.similaritySearch(query, 5);
    const retriever = await vectorStore.asRetriever();
    const result = await retriever.invoke(query);

    const cohereRerank = new CohereRerank({
        model: "rerank-english-v3.0",
        apiKey: process.env.COHERE_API_KEY,
        
    });

    const rerankedDocuments = await cohereRerank.rerank(result, query, {
        topN: 5,
    })
    console.log("Reranked Documents: ", rerankedDocuments);
    if(result.length>0){
        return [result[rerankedDocuments[0].index]]
    }else{
        return [];
    }
    // return result;

}

// Commented out top-level await - can be called from modules that support it
// (async () => {
//     const answers =  await queryVectorDB("What is artificial intelligence?");
//     console.log("Top Answer:", answers);
//     for (const answer of answers) {
//         console.log("----");
//         console.log(answer.pageContent);
//     }
// })();