import {Express} from 'express';
import { expressServer } from './express/expressServer.ts';
import { dbConnection } from './mongoose/dbConnection.ts';
import agenda from './agenda/agenda.ts';
import './agenda/jobs/imageJob.ts';




export async function bootStrapApp(app: Express, PORT:number){
    await dbConnection();
    await agenda.start();
    expressServer(app, PORT);
}