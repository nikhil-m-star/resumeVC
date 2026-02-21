export class AIService {
    private static instance: AIService;
    private apiKey: string | undefined;
    private model: string;

    private constructor() {
        this.apiKey = process.env.GROQ_API_KEY || process.env.AI_API_KEY;
        this.model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    }

    public static getInstance(): AIService {
        if (!AIService.instance) {
            AIService.instance = new AIService();
        }
        return AIService.instance;
    }

    private async callGroq(systemPrompt: string, userPrompt: string, maxTokens = 800): Promise<string> {
        if (!this.apiKey) {
            throw new Error('AI API key is not configured. Set GROQ_API_KEY in your environment.');
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                temperature: 0.4,
                max_tokens: maxTokens,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
            }),
        });

        if (!response.ok) {
            const details = await response.text();
            console.error(`Groq API call failed (${response.status}):`, details);
            throw new Error(`AI service error (${response.status})`);
        }

        const completion = await response.json() as {
            choices?: Array<{ message?: { content?: string } }>;
        };

        const content = completion?.choices?.[0]?.message?.content?.trim();
        if (!content) {
            throw new Error('No response from AI model');
        }

        return content;
    }

    public async generateSummary(resumeData: any): Promise<string> {
        const systemPrompt = [
            'You are an expert resume writer.',
            'Given the resume data, generate a concise, impactful professional summary (2-3 sentences).',
            'Focus on years of experience, key skills, and measurable achievements.',
            'Use strong action-oriented language. Do NOT include any labels or headers.',
            'Return ONLY the summary text, nothing else.',
        ].join('\n');

        const userPrompt = typeof resumeData === 'string' ? resumeData : JSON.stringify(resumeData);
        return this.callGroq(systemPrompt, userPrompt, 300);
    }

    public async improveSection(text: string, type: string): Promise<string> {
        const systemPrompt = [
            'You are an expert resume writer and career coach.',
            `You are improving the "${type}" section of a resume.`,
            'Rules:',
            '- Make the content more professional, concise, and impactful.',
            '- Add quantifiable metrics where possible (e.g., percentages, numbers).',
            '- Use strong action verbs (Led, Built, Optimized, Drove, Shipped).',
            '- Keep the same general meaning but elevate the language.',
            '- If the content has bullet points, keep them as bullet points.',
            '- Return ONLY the improved text. No explanations, no headers, no labels.',
        ].join('\n');

        return this.callGroq(systemPrompt, text, 600);
    }

    public async suggestSkills(jobDescription: string): Promise<string[]> {
        const systemPrompt = [
            'You are a hiring expert and resume strategist.',
            'Given a job description, extract the top 8-12 most important technical and soft skills.',
            'Return ONLY a JSON array of skill strings, e.g.: ["React", "TypeScript", "Leadership"]',
            'No explanations, no markdown, just the JSON array.',
        ].join('\n');

        const raw = await this.callGroq(systemPrompt, jobDescription, 300);

        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.filter((s): s is string => typeof s === 'string').map(s => s.trim()).filter(Boolean);
            }
        } catch {
            // Try to extract array from response
            const match = raw.match(/\[[\s\S]*\]/);
            if (match) {
                try {
                    const arr = JSON.parse(match[0]);
                    if (Array.isArray(arr)) {
                        return arr.filter((s): s is string => typeof s === 'string').map(s => s.trim()).filter(Boolean);
                    }
                } catch {
                    // Fall through
                }
            }
        }

        // Fallback: split by commas or newlines
        return raw.split(/[,\n]/).map(s => s.replace(/^[-*•"\s]+|["\s]+$/g, '').trim()).filter(Boolean).slice(0, 12);
    }

    public async generateSampleResume(category: string, companyType?: string, existingContext?: string): Promise<Record<string, unknown>> {
        const companyContext = companyType
            ? `The resume should be tailored for someone targeting "${companyType}" companies (use relevant company names, tech stacks, and metrics typical for ${companyType} roles).`
            : 'Use a mix of well-known and mid-sized tech companies.';

        const contextBlock = existingContext
            ? `\nIMPORTANT: The user already has resume content. Use their real experience as the foundation. Here is their existing data:\n${existingContext}\nBuild on this real data — keep their name, companies, and roles but enhance and expand the content. Add more detail, metrics, and professionalism.`
            : `\nThe user has NO existing resume data. You MUST invent a complete, realistic profile from scratch — generate a fictional name, email, phone, location, LinkedIn, GitHub, and website. Generate realistic company names, job titles, project names, and achievements that are the BEST FIT for a "${category}" role${companyType ? ` at ${companyType} companies` : ''}. Do NOT leave any field empty or use "..." as a value.`;

        const systemPrompt = [
            'You are an expert resume writer.',
            `Generate a realistic, detailed sample resume for a "${category}" professional.`,
            companyContext,
            contextBlock,
            'Return ONLY valid JSON with this exact structure (no markdown, no explanation):',
            '{',
            '  "sections": [',
            '    { "id": "personal", "title": "Personal Details", "type": "personal", "content": {',
            '        "name": "...", "email": "...", "phone": "...", "location": "...",',
            '        "linkedin": "...", "github": "...", "website": "..."',
            '    }},',
            '    { "id": "experience", "title": "Experience", "type": "list", "content": [',
            '        { "id": "exp-1", "title": "Role", "subtitle": "Company", "date": "Duration",',
            '          "location": "City, State", "link": "", "description": "- Bullet 1\\n- Bullet 2" }',
            '    ]},',
            '    { "id": "projects", "title": "Projects", "type": "list", "content": [',
            '        { "id": "proj-1", "title": "Project Name", "subtitle": "Tech Stack",',
            '          "date": "Year", "location": "", "link": "github.com/...",',
            '          "description": "- Bullet 1\\n- Bullet 2" }',
            '    ]},',
            '    { "id": "achievements", "title": "Achievements", "type": "list", "content": [',
            '        { "id": "ach-1", "title": "Achievement", "subtitle": "Organization",',
            '          "date": "Year", "location": "", "link": "", "description": "- Details" }',
            '    ]},',
            '    { "id": "education", "title": "Education", "type": "list", "content": [',
            '        { "id": "edu-1", "title": "Degree", "subtitle": "University",',
            '          "date": "Duration", "location": "City", "link": "",',
            '          "description": "- GPA or highlights" }',
            '    ]}',
            '  ]',
            '}',
            'CRITICAL RULES:',
            '- EVERY field must have a realistic value. NEVER leave any field as empty string "", "...", or placeholder.',
            '- Generate a complete fictional identity with real-sounding name, email, phone number, and city.',
            '- Include 2-3 experience entries with 3-4 bullet points each.',
            '- Include 2 project entries with concrete tech stacks, GitHub links, and measurable outcomes.',
            '- Include 1-2 achievements with specific awards, hackathon wins, or certifications.',
            '- Include 1 education entry with university name, degree, GPA, and relevant coursework.',
            '- Use quantifiable metrics in EVERY bullet (e.g., "Reduced latency by 40%", "Scaled to 500K users").',
            '- Make the person sound like a strong mid-senior candidate perfect for this role.',
        ].join('\n');

        const raw = await this.callGroq(systemPrompt, `Generate a ${category} resume${companyType ? ` targeting ${companyType} companies` : ''} now.`, 1500);
        const parsed = this.extractJsonObject(raw);

        if (!parsed || !Array.isArray(parsed.sections)) {
            throw new Error('Failed to parse AI-generated resume. Please try again.');
        }

        return parsed;
    }

    private extractJsonObject(rawContent: string): Record<string, unknown> | null {
        if (!rawContent || typeof rawContent !== 'string') return null;

        const trimmed = rawContent.trim();

        try {
            return JSON.parse(trimmed) as Record<string, unknown>;
        } catch {
            // Continue with best-effort extraction below.
        }

        const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (fencedMatch) {
            try {
                return JSON.parse(fencedMatch[1]) as Record<string, unknown>;
            } catch {
                // Continue with broad match.
            }
        }

        const objectMatch = trimmed.match(/\{[\s\S]*\}/);
        if (objectMatch) {
            try {
                return JSON.parse(objectMatch[0]) as Record<string, unknown>;
            } catch {
                return null;
            }
        }

        return null;
    }

    public async recommendResumeVersion(payload: {
        targetCompany: string;
        targetCategory: string;
        candidates: Array<{
            key: string;
            resumeTitle: string;
            resumeCategory: string;
            versionLabel: string;
            excerpt: string;
        }>;
        defaultCategoryRecommendations: string[];
        fallbackCandidateKey: string;
    }): Promise<{
        recommendedCandidateKey: string;
        fitScore: number;
        reasoning: string;
        categoryRecommendations: string[];
        companySpecificRecommendations: string[];
        missingResumeContent: string[];
    } | null> {
        if (!this.apiKey) return null;

        const systemPrompt = [
            'You are an expert resume strategist.',
            'Pick the best resume version candidate for a target company and role category.',
            'Return strict JSON only with keys:',
            'recommendedCandidateKey, fitScore, reasoning, categoryRecommendations, companySpecificRecommendations, missingResumeContent',
            'Rules:',
            '- recommendedCandidateKey must be one of the candidate keys provided.',
            '- fitScore should be an integer from 0 to 100.',
            '- In your reasoning, ALWAYS refer to resumes by their resumeTitle (e.g. "Software Engineer 2024"), NEVER use generic labels like "Candidate 1" or "Candidate 2".',
            '- categoryRecommendations should be actionable bullet-like strings.',
            '- companySpecificRecommendations should be tailored to the target company.',
            '- missingResumeContent should identify information gaps to fill in the resume.',
        ].join('\n');

        const userPrompt = JSON.stringify(payload);

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    temperature: 0.2,
                    max_tokens: 900,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                }),
            });

            if (!response.ok) {
                const details = await response.text();
                console.error(`Groq recommendation call failed (${response.status}):`, details);
                return null;
            }

            const completion = await response.json() as {
                choices?: Array<{ message?: { content?: string } }>;
            };
            const content = completion?.choices?.[0]?.message?.content || '';
            const parsed = this.extractJsonObject(content);

            if (!parsed) return null;

            const recommendedCandidateKey = typeof parsed.recommendedCandidateKey === 'string'
                ? parsed.recommendedCandidateKey
                : payload.fallbackCandidateKey;
            const fitScoreRaw = parsed.fitScore;
            const fitScore = typeof fitScoreRaw === 'number'
                ? Math.max(0, Math.min(100, Math.round(fitScoreRaw)))
                : 70;
            const reasoning = typeof parsed.reasoning === 'string' && parsed.reasoning.trim()
                ? parsed.reasoning.trim()
                : `Selected this version because it appears most aligned with ${payload.targetCompany}.`;

            const toStringArray = (value: unknown): string[] => {
                if (!Array.isArray(value)) return [];
                return value
                    .filter((item) => typeof item === 'string')
                    .map((item) => String(item).trim())
                    .filter(Boolean);
            };

            const categoryRecommendations = toStringArray(parsed.categoryRecommendations);
            const companySpecificRecommendations = toStringArray(parsed.companySpecificRecommendations);
            const missingResumeContent = toStringArray(parsed.missingResumeContent);

            return {
                recommendedCandidateKey,
                fitScore,
                reasoning,
                categoryRecommendations,
                companySpecificRecommendations,
                missingResumeContent,
            };
        } catch (error) {
            console.error('Groq recommendation call error:', error);
            return null;
        }
    }
}
