import { Router } from "express";
import { getBriefingDoc } from "../briefingDoc/getBriefingDoc";
import { updateOrCreateBriefingDoc } from "../briefingDoc/updateOrCreateBriefingdoc";



export function briefingRoutes(router:Router){
    router.get('/notes/briefing-doc', getBriefingDoc);
    router.put('/notes/briefing-doc', updateOrCreateBriefingDoc);
  
    return router;
}