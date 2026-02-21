import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET || 'resumevc-dev-jwt-secret';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        res.status(401).json({ message: 'Access denied. No token provided.' });
        return;
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        // @ts-ignore
        req.user = decoded;
        next();
    } catch (error) {
        const isExpired = error instanceof Error && error.name === 'TokenExpiredError';
        res.status(401).json({ message: isExpired ? 'Token expired.' : 'Invalid token.' });
    }
};
