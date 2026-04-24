import { Router } from "express";
import { getDocMindmap } from "../mindMap/getDocMindmap";
import { createOrUpdateMindMap } from "../mindMap/createOrUpdateMindMap";

export function mindMapRoutes(router:Router){
    router.get('/notes/mindMap', getDocMindmap);
    router.put('/notes/mindMap', createOrUpdateMindMap);
  
    return router;
}