import { NextFunction, Request, Response } from 'express';
import {google} from 'googleapis';

export async function getUserDriveFile(req: Request, res: Response, next: NextFunction) {
    try{
        const user = req.user as any;

        if(!user?.authData?.googleAccessToken){
            return res.status(401).json({message: "No google access token found"});
        }
        const oauth2Client = new google.auth.OAuth2({
            client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
            client_id: process.env.GOOGLE_CLIENT_ID as string,
        });

        oauth2Client.setCredentials({
            access_token: user?.authData?.googleAccessToken,
            refresh_token: user?.authData?.googleRefreshToken,
        });

        const drive = google.drive({version: 'v3', auth: oauth2Client});

        const response = await drive.files.list({
            pageSize: 10,
            fields: "files(id, name, mimeType, webViewLink)",
        });
        res.json(response.data.files);

    }catch(error: any){
        const message = error?.message || '';
        if (message.includes('insufficient authentication scopes') || error?.status === 403) {
            return res.status(403).json({
                message: "Google Drive permission missing. Reconnect your Google account to grant Drive access.",
                code: "GOOGLE_DRIVE_SCOPE_MISSING",
            });
        }
        console.error('Failed to fetch Drive files:', error?.message || error);
        res.status(500).json({message: "Failed to fetch Drive files."});

    }
}