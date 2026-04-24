import { Express, Router } from 'express';
import cors from 'cors';
import { handleExpressError } from '../exception/handleExpressError.ts';
import express from "express";
import type { Request, Response, NextFunction } from "express";
import passport from 'passport';
import session from 'express-session';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import type { SessionOptions } from 'express-session';
import { UserRepository } from '@/app/http/controllers/auth/repository/userRepository.ts';
import { apiV1 } from '@/routes/apiV1.ts';
import MongoStore from 'connect-mongo';
import { cwd } from 'process';
import path from 'path';

export function expressServer(app: Express, PORT: number) {

    const router = Router();

    // CORS middleware
    const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
    const frontendRedirect = process.env.FRONTEND_REDIRECT_URL || "http://localhost:3000/dashboard";

    app.use(cors({
        origin: frontendOrigin,
        credentials: true,
    }));

   const currentDir = cwd();
   app.use(express.static(path.join(currentDir, 'public')));

    // Body parsing middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

  

    

    // Session configuration
    const sess = {
        store:MongoStore.create({
            mongoUrl: process.env.MONGODB_URI as string,
            collectionName: 'sessions',
        }),
        secret: process.env.COOKIE_KEY as string,
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false }
    };

    if (process.env.NODE_ENV === 'production') {
        app.set('trust proxy', 1);
        sess.cookie.secure = true;
    }

    app.use(session(sess));
    app.use(passport.initialize());
    app.use(passport.session());

    // Google Strategy
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID as string,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
                callbackURL: process.env.CALLBACK_URL,
            },
            async (accessToken: string, refreshToken: string, profile: any, done: any) => {
                const userRepo = UserRepository.getInstance();
                const user = await userRepo.createUser(profile, { accessToken, refreshToken });
                // console.log("create user: ", profile);
                return done(null, user);
            }
        )
    );


    passport.serializeUser((user: any, done) => {
        console.log("user is ser::: ", user);
        done(null, user);
    });

    // called on every request that uses the session
    passport.deserializeUser(async (obj: any, done) => {
        try {
            //here check if user exists in db
            done(null, obj);
        } catch (err) {
            done(err);
        }
    });

    // Routes
     apiV1(app, router);

    app.get(
        "/auth/google",
        passport.authenticate("google",
            {
                scope: [
                    "profile",
                    "email",
                    "https://www.googleapis.com/auth/drive.readonly",
                    "https://www.googleapis.com/auth/drive.file",
                ],
                accessType: 'offline',
                prompt: 'consent',
            }
        )
    );

    app.get(
        "/auth/google/callback",
        passport.authenticate("google", {
            failureRedirect: "/auth/login",
            session: true,
        }),
        (req: Request, res: Response) => {
            // Persist the authenticated session before redirecting to avoid losing login state.
            req.session.save(() => {
                res.redirect(frontendRedirect);
            });
        }
    );


    app.get('/auth/me', (req, res) => {
        const sessionUser = (req.session as any)?.passport?.user;
        const currentUser = req.user ?? sessionUser;
        console.log("Current User: ", currentUser);
        console.log("Session User: ", sessionUser);
        console.log("Req User: ", req.user);

        if (!currentUser) {
            return res.status(401).json({ message: "Not logged in" });
        }

        res.json(currentUser);
    });

    app.post('/auth/logout', (req: Request, res: Response, next: NextFunction) => {
        const session = req.session;

        const finishLogout = () => {
            res.clearCookie('connect.sid');
            res.status(200).json({ message: 'Logged out' });
        };

        if (!req.logout) {
            if (session) {
                session.destroy(() => finishLogout());
                return;
            }

            finishLogout();
            return;
        }

        req.logout((err) => {
            if (err) {
                return next(err);
            }

            if (!session) {
                finishLogout();
                return;
            }

            session.destroy((destroyErr) => {
                if (destroyErr) {
                    return next(destroyErr);
                }

                finishLogout();
            });
        });
    });




    app.get('/', (req, res) => {
        res.json({ message: "express server is running" });
    });

    // Start server LAST
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}.`);
    });

      // Error handling middleware
    app.use(handleExpressError);    
}
