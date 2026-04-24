import {AIMessage,HumanMessage, SystemMessage} from "@langchain/core/messages";
import { PromptTemplate, ChatPromptTemplate } from "@langchain/core/prompts";  


export const generate_question_prompt = ChatPromptTemplate.fromTemplate(`
   you are an AI search assistant.
   The user asked: {question}
   step back and consider this question more broadly:
   1: Reframe it in general terms.
   2: Identify the manin themes or dimensions involved.
   3. Generate 5 diverse search queries that cover these dimensions. ensuring each query explores a different perspective or phrasing.
    Return valid json only using this shape: {{"questions": ["...", "...", "...", "...", "..."]}}.
   `);

  
export const response_generator_prompt = ChatPromptTemplate.fromTemplate(`
    you are a thoughtful Step-Back Research Assistant.

    The user asked: "{original_question}"

    we expanded this into several related queries to cover different perspectives:
    {questions}

    we retrieved the following documents based on these queries:
    {retrieved_docs}

    Your task:
    1. Step back and consider the original question in a broad, general sense.
    2. Review the retrieved information across all queries carefully.
    3. Synthesize a single, coherent answer that directly addresses the user's original question.
    4. if different queries highlight different aspects,integrate them into one clear explanation.
    5. Be concise, structured, and clear. When useful, cite or refernce information from the retrieved documents to support your answer.
    6. If the retrieved information is insufficient to answer the question, respond with "Insufficient information to provide an answer."
    Return valid json only using this shape: {{"reasoning":"...","answer":"..."}}.
    `);

export const grade_doc_prompt = PromptTemplate.fromTemplate(`
    You are a grader assessing relevance of a retrieved document to a user's question.
    Here is the retrieved document:
    {context}
    Here is the user's question: {question}
    
    If the document contains keyword(s) or semantic meaning related to the user question, grade it as relevant.
    
    Respond with ONLY a JSON object in this exact format:
    {{"binaryscore": "yes"}}
    or
    {{"binaryscore": "no"}}
    
    Do not include any other text.
    `);

export const transform_query_prompt = ChatPromptTemplate.fromTemplate(`
    You are generating a question that is well optimized for semantic search retrieval.
    Look at the input and try to reason about the underlying semantic intent/ meaning.
    Here is the initial question:
    \n -------------------------------------------------------
    {question}
    \n ------------------------------------------------
    Formulate an improved question.
    Return valid json only using this shape: {{"user_question":"...","improved_question":"...","Reasoning":"..."}}.
    `);