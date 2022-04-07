import { Response } from './http';
export declare const sendNotAuthenticatedError: (res: Response, code: string, message: string) => void;
export declare const sendUnauthorizedError: (res: Response, code: string, message: string) => void;
interface ErrorLike {
    code?: string;
    message: string;
    stack?: string;
}
export declare const sendError: (res: Response, err: ErrorLike) => void;
export declare const sendBadRequestError: (res: Response, err: {
    code: string;
    message: string;
}) => void;
export declare const sendUnexpectedError: (res: Response, err: Error) => void;
export {};
