    export function extractMessage(state:any, messageType:"ai" | "human") {
        const lastMessage = state.messages.filter((m:any)=> m._getType()=== messageType).slice(-1)[0];
        return lastMessage

    }


export const questionResponseFormatter = {
    response_format:{
        type:"json_object"
    }
} as any

export const gradeDocResponseFormatter = {
    response_format:{
        type:"json_object"
    }
} as any

export const generateResponseFormatter = {
    response_format:{
        type:"json_object"
    }
} as any

export const TransformResponseFormatter = {
    response_format:{
        type:"json_object"
    }
} as any