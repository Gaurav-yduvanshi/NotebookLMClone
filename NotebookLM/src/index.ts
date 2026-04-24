import express from 'express';
import dotenv from 'dotenv';
import { bootStrapApp } from './app/bootstrap/index.ts';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT as string);

bootStrapApp(app, PORT).catch((error) => {
    console.error('Failed to bootstrap app:', error);
    process.exit(1);
});