import { Router } from "express";
import { getStudyGuide } from "../studyguide/getStudyGuide";
import { updateOrCreateStudyGuide } from "../studyguide/updateOrCreateStudyGuide";


export function studyGuideRoutes(router:Router){
    router.get('/notes/studyGuide', getStudyGuide);
    router.put('/notes/studyGuide', updateOrCreateStudyGuide);
  
    return router;
}