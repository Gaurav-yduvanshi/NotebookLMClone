import {Router} from "express";
import {getUserDriveFile} from "../getUserDriveFile";



export function driveRoutes(router: Router){
    router.get('/users/files', getUserDriveFile);
    return router;
}