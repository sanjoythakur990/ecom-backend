import type { NextFunction, Request, Response } from "express"
import type ErrorHandler from "../utils/utility-class.js"
import type { ControllerType } from "../types/types.js";

export const errorMiddleware = (err: ErrorHandler, req: Request, res: Response, next: NextFunction) => {
    err.message ||= "Internal Server Error"
    err.statusCode ||= 500;
    console.log('err',err);
    
    if(err.name === "CastError") err.message = "Invalid ID"

    return res.status(err.statusCode).json({
        success: false,
        message: err.message
    })
}

export const  TryCatch = (func: ControllerType) => (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(func(req, res, next)).catch(next);
}

// const a = TryCatch()