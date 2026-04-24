// ✅ handleExpressError.ts (ESM + TypeScript)
import express from "express";
import type { Request, Response, NextFunction } from "express";

export function handleExpressError(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode && err.statusCode !== 200 ? err.statusCode : 500;
  res.status(statusCode).json({
    error: {
      message: err.message,
      status: statusCode,
    },
  });
}
