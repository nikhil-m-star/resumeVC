import { AIService } from './ai.service.js';
import { getCategoryGuidance, resolveBuiltinCategory } from '../constants/resume-categories.js';

export type RecommendationCandidate = {
    key: string;
    resumeId: string;
    resumeTitle: string;
    resumeCategory: string;
    versionId: string | null;
    versionLabel: string;
    createdAt: Date;
    excerpt: string;
};

export type ResumeRecommendationResult = {
    targetCompany: string;
    targetCategory: string;
    recommended: {
        resumeId: string;
        resumeTitle: string;
        resumeCategory: string;
        versionId: string | null;
        versionLabel: string;
        createdAt: string;
        excerpt: string;
    };
    fitScore: number;
    reasoning: string;
    categoryRecommendations: string[];
    companySpecificRecommendations: string[];
    missingResumeContent: string[];
    consideredCandidates: number;
    usedModel: boolean;
};

const MAX_CONTENT_LENGTH = 1800;

const CATEGORY_KEYWORDS: Record<string, string[]> = {
    General: ['impact', 'results', 'collaboration', 'ownership', 'projects'],
    'Software Engineering': ['architecture', 'api', 'scalable', 'performance', 'reliability'],
    Frontend: ['react', 'ui', 'ux', 'accessibility', 'frontend', 'design system'],
    Backend: ['api', 'database', 'backend', 'microservices', 'latency', 'cache'],
    'Full Stack': ['frontend', 'backend', 'end-to-end', 'product', 'delivery'],
    'Data Science': ['analysis', 'model', 'experiment', 'statistics', 'insight'],
    'Machine Learning': ['model', 'training', 'inference', 'mlops', 'feature engineering'],
    DevOps: ['ci/cd', 'infrastructure', 'deployment', 'kubernetes', 'monitoring'],
    Cloud: ['aws', 'gcp', 'azure', 'cloud', 'scaling', 'availability'],
    Cybersecurity: ['security', 'vulnerability', 'threat', 'compliance', 'incident'],
    'Product Management': ['roadmap', 'stakeholder', 'kpi', 'prioritization', 'customer'],
    'UI/UX Design': ['wireframe', 'prototype', 'usability', 'research', 'design system'],
    'QA / Testing': ['test automation', 'regression', 'qa', 'quality', 'defect'],
    'Mobile Development': ['ios', 'android', 'mobile', 'app store', 'performance'],
    Internship: ['project', 'learning', 'collaboration', 'impact', 'delivery'],
};

const normalize = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
};

const tokenize = (value: string): string[] =>
    normalize(value)
        .split(/[^a-z0-9+.#]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3);

const collectTextFragments = (value: unknown, output: string[]): void => {
    if (value == null) return;

    if (typeof value === 'string') {
        const cleaned = value
            .replace(/<\s*br\s*\/?>/gi, '\n')
            .replace(/<\s*\/p\s*>/gi, '\n')
            .replace(/<\s*li[^>]*>/gi, '- ')
            .replace(/<\s*\/li\s*>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (cleaned) output.push(cleaned);
        return;
    }

    if (Array.isArray(value)) {
        value.forEach((item) => collectTextFragments(item, output));
        return;
    }

    if (typeof value === 'object') {
        Object.values(value as Record<string, unknown>).forEach((entry) => collectTextFragments(entry, output));
    }
};

export const buildContentPreview = (content: string | null | undefined): string => {
    if (!content) return '';

    let parsed: unknown = content;

    if (typeof content === 'string') {
        try {
            parsed = JSON.parse(content);
        } catch {
            parsed = content;
        }
    }

    const fragments: string[] = [];
    collectTextFragments(parsed, fragments);

    const merged = fragments.join(' • ').trim();
    if (!merged) return '';

    if (merged.length <= MAX_CONTENT_LENGTH) return merged;
    return `${merged.slice(0, MAX_CONTENT_LENGTH)}...`;
};

const getCandidateScore = (
    candidate: RecommendationCandidate,
    targetCompany: string,
    targetCategory: string,
    newestTimestamp: number
): number => {
    const content = normalize(`${candidate.resumeTitle} ${candidate.resumeCategory} ${candidate.excerpt}`);
    let score = 0;

    const companyTokens = tokenize(targetCompany);
    companyTokens.forEach((token) => {
        if (content.includes(token)) score += 3;
    });

    const normalizedCategory = resolveBuiltinCategory(targetCategory);
    if (normalize(candidate.resumeCategory) === normalize(normalizedCategory)) {
        score += 4;
    }

    const keywords = CATEGORY_KEYWORDS[normalizedCategory] || CATEGORY_KEYWORDS.General;
    keywords.forEach((keyword) => {
        if (content.includes(normalize(keyword))) score += 1.25;
    });

    const ageDeltaDays = Math.max(0, (newestTimestamp - candidate.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    const recencyBoost = Math.max(0, 2 - ageDeltaDays / 30);

    return score + recencyBoost;
};

const buildHeuristicRecommendation = (
    candidates: RecommendationCandidate[],
    targetCompany: string,
    targetCategory: string
) => {
    const newestTimestamp = candidates.reduce((latest, candidate) => {
        const current = candidate.createdAt.getTime();
        return current > latest ? current : latest;
    }, 0);

    const ranked = candidates
        .map((candidate) => ({
            candidate,
            score: getCandidateScore(candidate, targetCompany, targetCategory, newestTimestamp),
        }))
        .sort((a, b) => b.score - a.score);

    const top = ranked[0]?.candidate || candidates[0];
    const topScore = ranked[0]?.score || 1;
    const fitScore = Math.max(45, Math.min(96, Math.round(58 + topScore * 4)));

    return {
        recommended: top,
        fitScore,
        reasoning: `Selected ${top.versionLabel} from ${top.resumeTitle} because it aligns best with ${targetCompany} and the ${resolveBuiltinCategory(targetCategory)} category signals in your existing content.`,
    };
};

export const recommendBestResumeVersion = async (input: {
    targetCompany: string;
    targetCategory?: string;
    candidates: RecommendationCandidate[];
}): Promise<ResumeRecommendationResult> => {
    const targetCategory = resolveBuiltinCategory(input.targetCategory);
    const categoryRecommendations = getCategoryGuidance(targetCategory);

    const heuristic = buildHeuristicRecommendation(input.candidates, input.targetCompany, targetCategory);

    const modelOutput = await AIService.getInstance().recommendResumeVersion({
        targetCompany: input.targetCompany,
        targetCategory,
        candidates: input.candidates.map((candidate) => ({
            key: candidate.key,
            resumeTitle: candidate.resumeTitle,
            resumeCategory: candidate.resumeCategory,
            versionLabel: candidate.versionLabel,
            excerpt: candidate.excerpt,
        })),
        defaultCategoryRecommendations: categoryRecommendations,
        fallbackCandidateKey: heuristic.recommended.key,
    });

    const chosenCandidate = modelOutput
        ? input.candidates.find((candidate) => candidate.key === modelOutput.recommendedCandidateKey)
        : null;

    const finalCandidate = chosenCandidate || heuristic.recommended;

    return {
        targetCompany: input.targetCompany,
        targetCategory,
        recommended: {
            resumeId: finalCandidate.resumeId,
            resumeTitle: finalCandidate.resumeTitle,
            resumeCategory: finalCandidate.resumeCategory,
            versionId: finalCandidate.versionId,
            versionLabel: finalCandidate.versionLabel,
            createdAt: finalCandidate.createdAt.toISOString(),
            excerpt: finalCandidate.excerpt,
        },
        fitScore: modelOutput?.fitScore || heuristic.fitScore,
        reasoning: modelOutput?.reasoning || heuristic.reasoning,
        categoryRecommendations:
            (modelOutput?.categoryRecommendations && modelOutput.categoryRecommendations.length > 0)
                ? modelOutput.categoryRecommendations
                : categoryRecommendations,
        companySpecificRecommendations:
            (modelOutput?.companySpecificRecommendations && modelOutput.companySpecificRecommendations.length > 0)
                ? modelOutput.companySpecificRecommendations
                : [
                    `Mirror ${input.targetCompany}'s job description keywords in your top experience bullets.`,
                    'Move the most relevant project closer to the top of your resume.',
                    'Add one outcome metric per key bullet to improve recruiter confidence.',
                ],
        missingResumeContent:
            (modelOutput?.missingResumeContent && modelOutput.missingResumeContent.length > 0)
                ? modelOutput.missingResumeContent
                : [
                    'Quantified impact metrics (latency, conversion, cost, uptime).',
                    'Tech stack depth for each major project or role.',
                    'Clear ownership statements for high-impact initiatives.',
                ],
        consideredCandidates: input.candidates.length,
        usedModel: Boolean(modelOutput && chosenCandidate),
    };
};
