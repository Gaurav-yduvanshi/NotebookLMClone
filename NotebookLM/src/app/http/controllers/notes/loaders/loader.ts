import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { Document } from "@langchain/core/documents";
import * as fs from "fs";
import * as path from "path";


// Custom TextLoader implementation
export async function loadText(filePath: string): Promise<Document[]> {
    try {
        const text = fs.readFileSync(filePath, "utf-8");
        return [
            new Document({
                pageContent: text,
                metadata: {
                    source: filePath
                }
            })
        ];
    } catch (error) {
        throw new Error(`Error loading text file: ${error}`);
    }
}

// Custom PDFLoader implementation - simplified version
export async function loadPDF(filePath: string): Promise<Document[]> {
    try {
        const buffer = fs.readFileSync(filePath);
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: buffer });
        const parsed = await parser.getText();
        await parser.destroy();
        const text = parsed.text?.trim();

        if (!text) {
            throw new Error("Could not extract text from PDF");
        }

        return [
            new Document({
                pageContent: text,
                metadata: {
                    source: filePath
                }
            })
        ];
    } catch (error) {
        throw new Error(`Error loading PDF file: ${error}`);
    }
}

export async function splitDocToChunks(docs:Document<Record<string, any>>[], props:{chunkSize:number, chunkOverlap:number}) {
    const textSplitter = new RecursiveCharacterTextSplitter({...props});

    const splitDocs = await textSplitter.splitDocuments(docs);
    return splitDocs;
}

export async function loadWeb(url:string) {
    const loader = new CheerioWebBaseLoader(url);
    const docs = await loader.load();
    return docs;
}

export async function loadDocument(
    filePath:string,
    // doctType:'txt' | 'pdf' | 'web',
    chunkSize: number = 1000,
    chunkOverlap: number = 200
    ) {
        const extensionWithouDot = path.extname(filePath).replace('.','');
        let docs = null;
        switch(extensionWithouDot.trim()){
            case 'txt':
                docs = await loadText(filePath);
                break;
            case 'pdf':
                docs = await loadPDF(filePath);
                break;
            case 'web':
                docs = await loadWeb(filePath);
                break;
            default:
                throw new Error('Unsupported document type');
        } 
        return splitDocToChunks(docs, {chunkSize, chunkOverlap});
    }
