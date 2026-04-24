import {Annotation,Send,StateGraph} from "@langchain/langgraph";

const chainState = Annotation.Root({
    generate: Annotation<'jokes'| 'comments'>,
    subjects: Annotation<string[]>,
    comments: Annotation<string[]>({
        reducer: (a, b) => a.concat(b),
    }),
    jokes: Annotation<string[]>({
        reducer: (a,b) => a.concat(b),
    })
})

const whatToGenerate = async(state: typeof chainState.State) => {
    
    return state.subjects.map((subject)=>{
        const node = state.generate === 'comments' ? 'generateComment': 'generate_joke';
        return new Send(node, {subjects:[subject]});
    })
}


const generateComment = async(state: typeof chainState.State) => {
    return{
        comments:[`Comment about ${state.subjects} - `]
    }
}

const generate_joke = async(state: typeof chainState.State) => {
    return{
        jokes: [`joke about ${state.subjects} - `],
    }
}

const graph = new StateGraph(chainState)
    .addNode('generate_joke', generate_joke)
    .addNode('generateComment', generateComment)
    
    .addConditionalEdges('__start__', whatToGenerate,['generateComment', 'generate_joke'])
    .addEdge('generate_joke', '__end__')
    .addEdge('generateComment', '__end__')

    .compile();

const res = await graph.invoke({subjects: ["cats", "dogs"], generate: 'comments'})
console.log(res);