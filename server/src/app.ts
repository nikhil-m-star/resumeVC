import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { clerkMiddleware } from '@clerk/express';
import authRoutes from './routes/auth.routes.js';
import resumeRoutes from './routes/resume.routes.js';
import aiRoutes from './routes/ai.routes.js';

const app = express();

app.use(helmet());
const allowedOrigins = [process.env.FRONTEND_URL].filter(Boolean) as string[];
const localhostOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use(cors({
    origin: (origin, callback) => {
        // Non-browser tools (curl/postman) may not send Origin.
        if (!origin) {
            callback(null, true);
            return;
        }

        if (localhostOriginPattern.test(origin) || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

const hasClerkSecret = Boolean(process.env.CLERK_SECRET_KEY);
const hasClerkPublishableKey = Boolean(process.env.CLERK_PUBLISHABLE_KEY);

if (hasClerkSecret && hasClerkPublishableKey) {
    app.use(clerkMiddleware());
} else {
    console.warn('Clerk middleware disabled. Set both CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY to enable server-side Clerk verification.');
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/ai', aiRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
