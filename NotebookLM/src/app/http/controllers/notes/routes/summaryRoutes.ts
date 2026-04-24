import { Router } from "express";
import { getDocSummary } from "../summary/getDocSummary";
import { updateOrCreateSummary } from "../summary/updateOrCreateSummary";


export function summaryRoutes(router:Router){
    router.get('/notes/summary', getDocSummary);
    router.put('/notes/summary', updateOrCreateSummary);
  
    return router;
}