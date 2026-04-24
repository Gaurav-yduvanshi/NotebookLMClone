import { Router } from "express";
import { getFaq } from "../faq/getFaq";
import { updateOrCreateFaq } from "../faq/updateOrCreateFaq";


export function faqRoutes(router:Router){
    router.get('/notes/faq', getFaq);
    router.put('/notes/faq', updateOrCreateFaq);
  
    return router;
}