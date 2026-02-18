import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z, ZodError } from 'zod';
import { Request, Response } from 'express';
import { getAuth } from '@clerk/express';

const prisma = new PrismaClient();
const jwtSecret = process.env.JWT_SECRET || 'resumevc-dev-jwt-secret';
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'resumevc-dev-refresh-secret';

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const decodeBase64Url = (value: string): string => {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return Buffer.from(padded, 'base64').toString('utf8');
};

const parseJwtPayload = (token: string): Record<string, unknown> | null => {
    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;
        const payload = decodeBase64Url(parts[1]);
        return JSON.parse(payload) as Record<string, unknown>;
    } catch {
        return null;
    }
};

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return 'Unknown error';
};

const signTokensAndRespond = (res: Response, userId: string, user: { id: string; email: string; name: string | null }) => {
    const token = jwt.sign({ userId }, jwtSecret, {
        expiresIn: '15m',
    });

    const refreshToken = jwt.sign(
        { userId },
        jwtRefreshSecret,
        { expiresIn: '7d' }
    );

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ token, user });
};

export const register = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password, name } = registerSchema.parse(req.body);

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
            },
        });

        const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ userId: user.id }, jwtRefreshSecret, { expiresIn: '7d' });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({ errors: error.issues });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const login = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        signTokensAndRespond(res, user.id, { id: user.id, email: user.email, name: user.name });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({ errors: error.issues });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const refreshToken = async (req: Request, res: Response): Promise<any> => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).send('Access Denied. No refresh token provided.');

    try {
        const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as { userId: string };
        const accessToken = jwt.sign({ userId: decoded.userId }, jwtSecret, { expiresIn: '15m' });

        res.json({ accessToken });
    } catch (error) {
        return res.status(400).send('Invalid refresh token.');
    }
};

export const logout = (req: Request, res: Response) => {
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
};

export const clerkExchange = async (req: Request, res: Response): Promise<any> => {
    try {
        let auth: { userId: string | null; sessionClaims?: Record<string, unknown> | null } = { userId: null, sessionClaims: null };
        try {
            const resolvedAuth = getAuth(req);
            auth = {
                userId: resolvedAuth.userId,
                sessionClaims: (resolvedAuth.sessionClaims as Record<string, unknown> | undefined) || null,
            };
        } catch {
            // Clerk middleware/secret may be unavailable in local dev.
        }
        const authHeader = req.headers.authorization;
        const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
        const body = (req.body || {}) as {
            clerkUserId?: unknown;
            email?: unknown;
            name?: unknown;
        };

        let userId = auth.userId;
        let claims = auth.sessionClaims || undefined;

        // Local-dev fallback when Clerk backend verification is not configured.
        if (!userId && process.env.NODE_ENV !== 'production' && bearerToken) {
            const parsedPayload = parseJwtPayload(bearerToken);
            if (parsedPayload && typeof parsedPayload.sub === 'string') {
                userId = parsedPayload.sub;
                claims = parsedPayload;
            }
        }

        // Secondary local-dev fallback when Clerk token APIs return null.
        if (!userId && process.env.NODE_ENV !== 'production' && typeof body.clerkUserId === 'string' && body.clerkUserId) {
            userId = body.clerkUserId;
            claims = {
                ...claims,
                email:
                    typeof body.email === 'string' && body.email
                        ? body.email
                        : claims?.email,
                name:
                    typeof body.name === 'string' && body.name
                        ? body.name
                        : claims?.name,
            };
        }

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized Clerk session' });
        }

        const emailFromClaims =
            (typeof claims?.email === 'string' && claims.email) ||
            (typeof claims?.email_address === 'string' && claims.email_address) ||
            (typeof claims?.['primary_email_address'] === 'string' && claims['primary_email_address']) ||
            null;
        const emailFromBody =
            typeof body.email === 'string' && body.email.includes('@')
                ? body.email
                : null;
        const email = emailFromClaims || emailFromBody;

        const displayName =
            (typeof claims?.name === 'string' && claims.name) ||
            (typeof claims?.full_name === 'string' && claims.full_name) ||
            [claims?.given_name, claims?.family_name].filter((part) => typeof part === 'string' && part).join(' ') ||
            (typeof body.name === 'string' && body.name) ||
            null;

        const fallbackEmail = `${userId}@clerk.local`;
        const resolvedEmail = email || fallbackEmail;
        let user = await prisma.user.findUnique({ where: { email: resolvedEmail } });

        // Backfill previously created fallback users once real email becomes available.
        if (!user && email) {
            const fallbackUser = await prisma.user.findUnique({ where: { email: fallbackEmail } });
            if (fallbackUser) {
                const existingUserWithRealEmail = await prisma.user.findUnique({ where: { email } });
                if (existingUserWithRealEmail) {
                    user = existingUserWithRealEmail;
                } else {
                    user = await prisma.user.update({
                        where: { id: fallbackUser.id },
                        data: {
                            email,
                            name: fallbackUser.name || displayName || null,
                        },
                    });
                }
            }
        }

        if (!user) {
            user = await prisma.user.findUnique({ where: { email: fallbackEmail } });
        }

        if (!user) {
            const randomPassword = crypto.randomBytes(24).toString('hex');
            const hashedPassword = await bcrypt.hash(randomPassword, 10);
            user = await prisma.user.create({
                data: {
                    email: resolvedEmail,
                    password: hashedPassword,
                    name: displayName || null,
                },
            });
        } else if ((!user.name && displayName) || (user.email.endsWith('@clerk.local') && email && user.email !== email)) {
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    name: user.name || displayName || null,
                    email: user.email.endsWith('@clerk.local') && email ? email : user.email,
                },
            });
        }

        signTokensAndRespond(res, user.id, { id: user.id, email: user.email, name: user.name });
    } catch (error) {
        const message = getErrorMessage(error);
        console.error('clerkExchange failed:', error);
        res.status(500).json({ message: `clerkExchange failed: ${message}` });
    }
};
