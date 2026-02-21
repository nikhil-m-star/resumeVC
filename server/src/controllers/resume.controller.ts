import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z, ZodError } from 'zod';
import { buildResumeCompanyTypeProfile, COMPANY_TYPE_LABELS } from '../services/company-type.service.js';
import { AIService } from '../services/ai.service.js';
import {
    BUILTIN_RESUME_CATEGORIES,
    DEFAULT_RESUME_CATEGORY,
    resolveBuiltinCategory,
} from '../constants/resume-categories.js';
import {
    buildContentPreview,
    RecommendationCandidate,
    recommendBestResumeVersion,
} from '../services/resume-recommendation.service.js';

const prisma = new PrismaClient();

const createResumeSchema = z.object({
    title: z.string(),
    category: z.string().max(64).optional(),
    description: z.string().optional(),
    isPublic: z.boolean().optional(),
});

const createVersionSchema = z.object({
    resumeId: z.string().uuid(),
    content: z.any(), // JSON content
    commitMsg: z.string().optional(),
});

const recommendResumeSchema = z.object({
    targetCompany: z.string().min(2).max(120),
    targetCategory: z.string().max(64).optional(),
});

export const createResume = async (req: Request, res: Response): Promise<any> => {
    try {
        const { title, category, description, isPublic } = createResumeSchema.parse(req.body);
        // @ts-ignore - req.user is added by auth middleware
        const userId = req.user?.userId;

        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const resume = await prisma.resume.create({
            data: {
                title,
                category: resolveBuiltinCategory(category),
                description,
                isPublic,
                ownerId: userId,
            },
        });

        res.status(201).json(resume);
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({ errors: error.issues });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getUserResumes = async (req: Request, res: Response): Promise<any> => {
    try {
        // @ts-ignore
        const userId = req.user?.userId;
        const resumes = await prisma.resume.findMany({
            where: { ownerId: userId, deletedAt: null },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                title: true,
                category: true,
                description: true,
                isPublic: true,
                createdAt: true,
                updatedAt: true,
                deletedAt: true,
                _count: { select: { versions: true } },
            },
        });
        res.json(resumes);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getResumeById = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = String(req.params.id);
        // @ts-ignore
        const userId = req.user?.userId;

        const resume = await prisma.resume.findFirst({
            where: { id, ownerId: userId, deletedAt: null },
        });

        if (!resume) return res.status(404).json({ message: 'Resume not found' });

        res.json({
            ...resume,
            companyTypeProfile: buildResumeCompanyTypeProfile(resume.content),
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateResumeSchema = z.object({
    title: z.string().optional(),
    category: z.string().max(64).optional(),
    description: z.string().optional(),
    isPublic: z.boolean().optional(),
    content: z.string().optional(), // JSON content as string
});

export const updateResume = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = String(req.params.id);
        const { title, category, description, isPublic, content } = updateResumeSchema.parse(req.body);
        // @ts-ignore
        const userId = req.user?.userId;

        // Check ownership
        const existing = await prisma.resume.findFirst({
            where: { id, ownerId: userId },
        });

        if (!existing) return res.status(404).json({ message: 'Resume not found' });

        const resume = await prisma.resume.update({
            where: { id },
            data: {
                title,
                category: typeof category === 'string' ? resolveBuiltinCategory(category) : undefined,
                description,
                isPublic,
                content,
            },
        });

        res.json({
            ...resume,
            companyTypeProfile: buildResumeCompanyTypeProfile(resume.content),
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({ errors: error.issues });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteResume = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = String(req.params.id);
        // @ts-ignore
        const userId = req.user?.userId;

        const existing = await prisma.resume.findFirst({
            where: { id, ownerId: userId, deletedAt: null },
        });

        if (!existing) return res.status(404).json({ message: 'Resume not found' });

        await prisma.resume.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getResumeVersions = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = String(req.params.id);
        const versions = await prisma.resumeVersion.findMany({
            where: { resumeId: id },
            orderBy: { version: 'desc' },
        });
        res.json(versions);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const createVersion = async (req: Request, res: Response): Promise<any> => {
    try {
        const { resumeId, content, commitMsg } = createVersionSchema.parse(req.body);

        // Get latest version number
        const latestVersion = await prisma.resumeVersion.findFirst({
            where: { resumeId },
            orderBy: { version: 'desc' },
        });

        const newVersionNum = (latestVersion?.version || 0) + 1;

        const version = await prisma.resumeVersion.create({
            data: {
                resumeId,
                content: typeof content === 'string' ? content : JSON.stringify(content),
                commitMsg,
                version: newVersionNum,
            },
        });

        res.status(201).json(version);
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({ errors: error.issues });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getDiff = async (req: Request, res: Response): Promise<any> => {
    try {
        const { versionId1, versionId2 } = req.query;

        if (typeof versionId1 !== 'string' || typeof versionId2 !== 'string') {
            return res.status(400).json({ message: 'Invalid version IDs provided' });
        }

        const v1 = await prisma.resumeVersion.findUnique({ where: { id: versionId1 } });
        const v2 = await prisma.resumeVersion.findUnique({ where: { id: versionId2 } });

        if (!v1 || !v2) {
            return res.status(404).json({ message: 'Versions not found' });
        }

        res.json({ version1: v1, version2: v2 });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getResumeCompanyTypes = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = String(req.params.id);
        // @ts-ignore
        const userId = req.user?.userId;

        const resume = await prisma.resume.findFirst({
            where: { id, ownerId: userId, deletedAt: null },
            select: {
                id: true,
                title: true,
                updatedAt: true,
                content: true,
            },
        });

        if (!resume) return res.status(404).json({ message: 'Resume not found' });

        const profile = buildResumeCompanyTypeProfile(resume.content);

        res.json({
            resumeId: resume.id,
            title: resume.title,
            updatedAt: resume.updatedAt,
            ...profile,
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getUserResumeCompanyTypes = async (req: Request, res: Response): Promise<any> => {
    try {
        // @ts-ignore
        const userId = req.user?.userId;

        const resumes = await prisma.resume.findMany({
            where: { ownerId: userId, deletedAt: null },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                title: true,
                updatedAt: true,
                content: true,
            },
        });

        const summaries = resumes.map((resume) => {
            const profile = buildResumeCompanyTypeProfile(resume.content);
            return {
                resumeId: resume.id,
                title: resume.title,
                updatedAt: resume.updatedAt,
                ...profile,
            };
        });

        const groupedMap = new Map<string, { count: number; resumeIds: string[]; titles: string[] }>();

        summaries.forEach((summary) => {
            if (summary.totalCompanies === 0 || summary.primaryCompanyType === 'unknown') return;
            const existing = groupedMap.get(summary.primaryCompanyType) || { count: 0, resumeIds: [], titles: [] };
            groupedMap.set(summary.primaryCompanyType, {
                count: existing.count + 1,
                resumeIds: [...existing.resumeIds, summary.resumeId],
                titles: [...existing.titles, summary.title],
            });
        });

        const groupedByPrimaryType = Array.from(groupedMap.entries())
            .map(([type, value]) => ({
                type,
                typeLabel: COMPANY_TYPE_LABELS[type as keyof typeof COMPANY_TYPE_LABELS],
                count: value.count,
                resumeIds: value.resumeIds,
                titles: value.titles,
            }))
            .sort((a, b) => b.count - a.count);

        res.json({
            totalResumes: resumes.length,
            categorizedResumes: summaries.filter((summary) => summary.primaryCompanyType !== 'unknown').length,
            groupedByPrimaryType,
            summaries,
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getRecommendationCategories = async (_req: Request, res: Response): Promise<any> => {
    res.json({
        categories: BUILTIN_RESUME_CATEGORIES,
        defaultCategory: DEFAULT_RESUME_CATEGORY,
    });
};

export const recommendResumeVersion = async (req: Request, res: Response): Promise<any> => {
    try {
        const { targetCompany, targetCategory } = recommendResumeSchema.parse(req.body);
        // @ts-ignore
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const resumes = await prisma.resume.findMany({
            where: { ownerId: userId, deletedAt: null },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                title: true,
                category: true,
                content: true,
                updatedAt: true,
                versions: {
                    orderBy: { version: 'desc' },
                    take: 4,
                    select: {
                        id: true,
                        version: true,
                        content: true,
                        createdAt: true,
                        commitMsg: true,
                    },
                },
            },
        });

        const candidates: RecommendationCandidate[] = [];

        resumes.forEach((resume) => {
            const normalizedCategory = resume.category || DEFAULT_RESUME_CATEGORY;

            resume.versions.forEach((version) => {
                const excerpt = buildContentPreview(version.content);
                if (!excerpt) return;

                candidates.push({
                    key: `${resume.id}:${version.id}`,
                    resumeId: resume.id,
                    resumeTitle: resume.title,
                    resumeCategory: normalizedCategory,
                    versionId: version.id,
                    versionLabel: `v${version.version}${version.commitMsg ? ` - ${version.commitMsg}` : ''}`,
                    createdAt: version.createdAt,
                    excerpt,
                });
            });

            if (resume.versions.length > 0) return;
            if (!resume.content) return;

            const draftExcerpt = buildContentPreview(resume.content);
            if (!draftExcerpt) return;

            candidates.push({
                key: `${resume.id}:draft`,
                resumeId: resume.id,
                resumeTitle: resume.title,
                resumeCategory: normalizedCategory,
                versionId: null,
                versionLabel: 'Draft (latest autosave)',
                createdAt: resume.updatedAt,
                excerpt: draftExcerpt,
            });
        });

        if (candidates.length === 0) {
            return res.status(400).json({
                message: 'No resume content available to evaluate. Add content and save at least one draft or version first.',
            });
        }

        const recommendation = await recommendBestResumeVersion({
            targetCompany: targetCompany.trim(),
            targetCategory: resolveBuiltinCategory(targetCategory),
            candidates,
        });

        res.json(recommendation);
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({ errors: error.issues });
        }
        console.error('Recommendation error:', error);
        res.status(500).json({ message: 'Failed to generate recommendation' });
    }
};

export const suggestAISkills = async (req: Request, res: Response): Promise<any> => {
    try {
        const { jobDescription } = req.body;
        if (!jobDescription) return res.status(400).json({ message: 'Job description is required' });

        const suggestions = await AIService.getInstance().suggestSkills(jobDescription);
        res.json({ suggestions });
    } catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({ message: 'AI Service Error' });
    }
};

export const improveAISection = async (req: Request, res: Response): Promise<any> => {
    try {
        const { text, type } = req.body;
        if (!text || !type) return res.status(400).json({ message: 'Text and type are required' });

        const improvedText = await AIService.getInstance().improveSection(text, type);
        res.json({ improvedText });
    } catch (error) {
        console.error('AI Error:', error);
        res.status(500).json({ message: 'AI Service Error' });
    }
};
