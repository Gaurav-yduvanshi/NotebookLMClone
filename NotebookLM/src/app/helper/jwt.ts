import { NextFunction, Response, Request } from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import dotenv from 'dotenv';
dotenv.config();



function jwtPayload(userId: Types.ObjectId) {
    const payload = {
        iss: null,
        sub: userId,
        aud: userId, // represent a specific audience that will consume the token
        exp: Math.floor(Date.now() / 1000) + (60 * 60) + (60 * 60), // Expiration time of 2 hours
        iat: Math.floor(Date.now() / 1000) // Issued at time
    };

    return payload;
}

export function signAccessToken(userId: Types.ObjectId) {
    const payload = jwtPayload(userId);
    const key = process.env.JWT_SECRET_KEY as string;
    return new Promise((resolve, reject) => {
        (jwt as any).sign(payload, key, (error: Error, token: string) => {
            if (error) {
                reject(error);
            } else {
                resolve(token);
            }
        });
    });
}

export function signRefreshToken(userId: Types.ObjectId) {
    const payload = jwtPayload(userId);
    const key = process.env.REFRESH_JWT_SECRET_KEY as string;
    return new Promise((resolve, reject)=>{
        jwt.sign(payload, key, (error, token) => {
            if (error) {
                reject(error);
            }
            resolve(token);
        });
    });
}

export async function verifyExpressToken(req: Request, res: Response, next: NextFunction) {
    try{
        const token = req.header("authorization") as string;
        const accessToken = token?.split(" ")[1];

        if(!accessToken){
            return res.status(401).json({message: "Unauthorized"});
        }

        const key = process.env.JWT_SECRET_KEY as string;

        jwt.verify(accessToken, key, (error, payload)=>{
            if(error){
                return res.status(401).json({message: "Unauthorized"});
            }
            next();
        })

    }catch(error){
        res.status(401).json({message: "Unauthorized"});
    }
}


export async function generateToken(userId: Types.ObjectId) {
    const [accessToken, refreshToken] = await Promise.all([
        signAccessToken(userId),
        signRefreshToken(userId)
    ]);

    return { accessToken, refreshToken };
}