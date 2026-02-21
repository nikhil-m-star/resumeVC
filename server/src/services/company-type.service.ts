type CompanyType =
    | 'startup'
    | 'product'
    | 'service_consulting'
    | 'enterprise'
    | 'government_public'
    | 'nonprofit'
    | 'education_research'
    | 'finance_fintech'
    | 'healthcare_life_sciences'
    | 'ecommerce_retail'
    | 'unknown';

type CompanyTypeScoreCard = Record<CompanyType, number>;

type ExtractedCompany = {
    company: string;
    context: string;
};

export type CompanyClassification = {
    company: string;
    type: CompanyType;
    typeLabel: string;
    confidence: number;
    matchedBy: string[];
};

export type CompanyTypeDistribution = {
    type: CompanyType;
    typeLabel: string;
    count: number;
    share: number;
    score: number;
};

export type ResumeCompanyTypeProfile = {
    totalCompanies: number;
    primaryCompanyType: CompanyType;
    primaryCompanyTypeLabel: string;
    primaryConfidence: number;
    secondaryCompanyTypes: Array<{
        type: CompanyType;
        typeLabel: string;
        count: number;
        confidence: number;
    }>;
    companyClassifications: CompanyClassification[];
    typeDistribution: CompanyTypeDistribution[];
};

const COMPANY_TYPE_PRIORITY: CompanyType[] = [
    'government_public',
    'nonprofit',
    'education_research',
    'service_consulting',
    'finance_fintech',
    'healthcare_life_sciences',
    'ecommerce_retail',
    'startup',
    'enterprise',
    'product',
    'unknown',
];

const COMPANY_TYPES: CompanyType[] = [
    'startup',
    'product',
    'service_consulting',
    'enterprise',
    'government_public',
    'nonprofit',
    'education_research',
    'finance_fintech',
    'healthcare_life_sciences',
    'ecommerce_retail',
    'unknown',
];

const KNOWN_COMPANIES: Array<{ matcher: RegExp; type: CompanyType; reason: string }> = [
    { matcher: /\bgoogle\b|\balphabet\b/i, type: 'product', reason: 'known technology company' },
    { matcher: /\bmicrosoft\b/i, type: 'product', reason: 'known technology company' },
    { matcher: /\bmeta\b|\bfacebook\b/i, type: 'product', reason: 'known technology company' },
    { matcher: /\bapple\b/i, type: 'product', reason: 'known technology company' },
    { matcher: /\bnetflix\b/i, type: 'product', reason: 'known technology company' },
    { matcher: /\bamazon\b|\baws\b/i, type: 'product', reason: 'known technology company' },
    { matcher: /\buber\b|\blyft\b|\bairbnb\b/i, type: 'product', reason: 'known product platform' },
    { matcher: /\bsalesforce\b|\badobe\b|\batlassian\b/i, type: 'product', reason: 'known software product company' },
    { matcher: /\bstripe\b|\bplaid\b|\bbraintree\b/i, type: 'finance_fintech', reason: 'known fintech company' },
    { matcher: /\bpaypal\b|\bvisa\b|\bmastercard\b/i, type: 'finance_fintech', reason: 'known financial services company' },
    { matcher: /\bjpmorgan\b|\bgoldman\b|\bmorgan stanley\b|\bciti\b/i, type: 'finance_fintech', reason: 'known financial institution' },
    { matcher: /\baccenture\b|\bdeloitte\b|\bcapgemini\b/i, type: 'service_consulting', reason: 'known consulting company' },
    { matcher: /\bcognizant\b|\binfosys\b|\bwipro\b|\btcs\b/i, type: 'service_consulting', reason: 'known IT services company' },
    { matcher: /\bpwc\b|\bkpmg\b|\bey\b|\bearnst\b/i, type: 'service_consulting', reason: 'known professional services company' },
    { matcher: /\bibm\b|\boracle\b|\bsap\b|\bsiemens\b/i, type: 'enterprise', reason: 'known enterprise company' },
    { matcher: /\bwalmart\b|\btarget\b|\bcostco\b/i, type: 'ecommerce_retail', reason: 'known retail company' },
    { matcher: /\bshopify\b|\betsy\b/i, type: 'ecommerce_retail', reason: 'known commerce company' },
];

const COMPANY_KEYWORDS: Record<Exclude<CompanyType, 'unknown'>, string[]> = {
    startup: ['startup', 'stealth', 'seed', 'series a', 'series b', 'early-stage', 'early stage', 'venture-backed'],
    product: ['product', 'platform', 'software', 'saas', 'app', 'applications', 'technology'],
    service_consulting: ['consulting', 'consultancy', 'services', 'solutions', 'agency', 'outsourcing', 'system integrator'],
    enterprise: ['enterprise', 'corporation', 'corp', 'global', 'international', 'fortune 500'],
    government_public: ['government', 'govt', 'federal', 'state', 'county', 'city of', 'public sector', 'ministry', 'department of'],
    nonprofit: ['non-profit', 'nonprofit', 'charity', 'foundation', 'ngo', 'association', 'mission-driven'],
    education_research: ['university', 'college', 'school', 'institute', 'research', 'laboratory', 'lab'],
    finance_fintech: ['bank', 'capital', 'financial', 'fintech', 'insurance', 'payments', 'lending', 'credit'],
    healthcare_life_sciences: ['health', 'healthcare', 'hospital', 'clinic', 'medical', 'pharma', 'biotech', 'life sciences'],
    ecommerce_retail: ['ecommerce', 'e-commerce', 'retail', 'marketplace', 'commerce', 'store'],
};

const CONTEXT_KEYWORDS: Record<Exclude<CompanyType, 'unknown'>, string[]> = {
    startup: ['founding engineer', 'first engineer', 'zero to one', 'mvp', 'seed stage'],
    product: ['product roadmap', 'user growth', 'consumer app', 'platform engineering'],
    service_consulting: ['client delivery', 'client project', 'consulting engagement', 'billable'],
    enterprise: ['enterprise accounts', 'b2b enterprise', 'legacy systems', 'compliance-heavy'],
    government_public: ['public policy', 'citizen services', 'public administration', 'government program'],
    nonprofit: ['donor', 'community outreach', 'social impact', 'grant-funded'],
    education_research: ['curriculum', 'academic', 'research publication', 'lab environment'],
    finance_fintech: ['risk model', 'kyc', 'aml', 'trading', 'payments'],
    healthcare_life_sciences: ['clinical', 'patient', 'ehr', 'fda', 'medical records'],
    ecommerce_retail: ['checkout', 'cart', 'inventory', 'merchant'],
};

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
    startup: 'Startup',
    product: 'Product Company',
    service_consulting: 'Service / Consulting',
    enterprise: 'Enterprise',
    government_public: 'Government / Public Sector',
    nonprofit: 'Non-profit',
    education_research: 'Education / Research',
    finance_fintech: 'Finance / Fintech',
    healthcare_life_sciences: 'Healthcare / Life Sciences',
    ecommerce_retail: 'E-commerce / Retail',
    unknown: 'Unknown',
};

const emptyScoreCard = (): CompanyTypeScoreCard => ({
    startup: 0,
    product: 0,
    service_consulting: 0,
    enterprise: 0,
    government_public: 0,
    nonprofit: 0,
    education_research: 0,
    finance_fintech: 0,
    healthcare_life_sciences: 0,
    ecommerce_retail: 0,
    unknown: 0,
});

const round = (value: number, precision = 2): number => {
    const scale = Math.pow(10, precision);
    return Math.round(value * scale) / scale;
};

const normalizeText = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
};

const parseContent = (content: string | null): any => {
    if (!content) return null;
    try {
        return JSON.parse(content);
    } catch {
        return null;
    }
};

const collectTextValues = (values: unknown[]): string =>
    values
        .filter((value) => typeof value === 'string')
        .map((value) => String(value).trim())
        .filter(Boolean)
        .join(' ');

const extractCompanyField = (item: any): string => {
    if (!item || typeof item !== 'object') return '';
    const candidates = [item.subtitle, item.company, item.organization, item.employer, item.organizationName];
    const company = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
    return typeof company === 'string' ? company.trim() : '';
};

const extractFromSectionItems = (items: unknown[]): ExtractedCompany[] => {
    return items
        .filter((item) => item && typeof item === 'object')
        .map((item) => {
            const company = extractCompanyField(item);
            if (!company) return null;
            const obj = item as any;
            const context = collectTextValues([obj.title, obj.role, obj.position, obj.description, obj.details, obj.location]);
            return { company, context };
        })
        .filter((entry): entry is ExtractedCompany => Boolean(entry));
};

const extractExperienceCompanies = (resumeContent: any): ExtractedCompany[] => {
    if (!resumeContent || typeof resumeContent !== 'object') return [];

    const result: ExtractedCompany[] = [];

    if (Array.isArray(resumeContent.sections)) {
        const experienceSections = resumeContent.sections.filter((section: any) => {
            const sectionId = normalizeText(section?.id);
            const sectionTitle = normalizeText(section?.title);
            return sectionId.includes('experience') || sectionTitle.includes('experience');
        });

        experienceSections.forEach((section: any) => {
            const content = Array.isArray(section?.content)
                ? section.content
                : Array.isArray(section?.items)
                    ? section.items
                    : [];
            result.push(...extractFromSectionItems(content));
        });
    }

    if (Array.isArray(resumeContent.experience)) {
        result.push(...extractFromSectionItems(resumeContent.experience));
    }

    const dedupedByCompany = new Map<string, ExtractedCompany>();
    result.forEach((entry) => {
        const normalizedCompany = normalizeText(entry.company);
        const existing = dedupedByCompany.get(normalizedCompany);
        if (!existing) {
            dedupedByCompany.set(normalizedCompany, entry);
            return;
        }
        if (entry.context.length > existing.context.length) {
            dedupedByCompany.set(normalizedCompany, entry);
        }
    });

    return Array.from(dedupedByCompany.values());
};

const collectMatches = (text: string, keywords: string[]): string[] => {
    const normalizedText = normalizeText(text);
    if (!normalizedText) return [];
    return keywords.filter((keyword) => normalizedText.includes(normalizeText(keyword)));
};

const classifyCompany = (company: string, context = ''): CompanyClassification => {
    const normalizedCompany = normalizeText(company);
    const score = emptyScoreCard();
    const matchedBy: string[] = [];

    KNOWN_COMPANIES.forEach((entry) => {
        if (entry.matcher.test(company)) {
            score[entry.type] += 3.5;
            matchedBy.push(`${entry.reason} (${entry.type})`);
        }
    });

    (Object.keys(COMPANY_KEYWORDS) as Array<Exclude<CompanyType, 'unknown'>>).forEach((type) => {
        const companyMatches = collectMatches(normalizedCompany, COMPANY_KEYWORDS[type]);
        if (companyMatches.length > 0) {
            score[type] += Math.min(companyMatches.length * 1.2, 2.8);
            matchedBy.push(`company keywords: ${companyMatches.join(', ')}`);
        }

        const contextMatches = collectMatches(context, CONTEXT_KEYWORDS[type]);
        if (contextMatches.length > 0) {
            score[type] += Math.min(contextMatches.length * 0.75, 1.5);
            matchedBy.push(`context keywords: ${contextMatches.join(', ')}`);
        }
    });

    const sortedTypes = COMPANY_TYPES
        .filter((type) => type !== 'unknown')
        .sort((a, b) => {
            if (score[b] !== score[a]) return score[b] - score[a];
            return COMPANY_TYPE_PRIORITY.indexOf(a) - COMPANY_TYPE_PRIORITY.indexOf(b);
        });

    const bestType = sortedTypes[0];
    const bestScore = score[bestType] || 0;

    if (bestScore < 1.4) {
        return {
            company,
            type: 'unknown',
            typeLabel: COMPANY_TYPE_LABELS.unknown,
            confidence: normalizedCompany ? 0.35 : 0,
            matchedBy: matchedBy.length > 0 ? matchedBy : ['insufficient signal'],
        };
    }

    const confidence = Math.min(0.98, round(0.42 + bestScore * 0.12));

    return {
        company,
        type: bestType,
        typeLabel: COMPANY_TYPE_LABELS[bestType],
        confidence,
        matchedBy,
    };
};

const buildEmptyProfile = (): ResumeCompanyTypeProfile => ({
    totalCompanies: 0,
    primaryCompanyType: 'unknown',
    primaryCompanyTypeLabel: COMPANY_TYPE_LABELS.unknown,
    primaryConfidence: 0,
    secondaryCompanyTypes: [],
    companyClassifications: [],
    typeDistribution: [],
});

export const buildResumeCompanyTypeProfile = (content: string | null): ResumeCompanyTypeProfile => {
    const resumeContent = parseContent(content);
    const extractedCompanies = extractExperienceCompanies(resumeContent);

    if (extractedCompanies.length === 0) {
        return buildEmptyProfile();
    }

    const companyClassifications = extractedCompanies.map((entry) => classifyCompany(entry.company, entry.context));
    const classifiedCompanies = companyClassifications.filter((entry) => entry.type !== 'unknown');

    if (classifiedCompanies.length === 0) {
        return {
            ...buildEmptyProfile(),
            totalCompanies: companyClassifications.length,
            companyClassifications,
        };
    }

    const distributionMap = new Map<CompanyType, { count: number; score: number }>();
    classifiedCompanies.forEach((entry) => {
        const existing = distributionMap.get(entry.type) || { count: 0, score: 0 };
        distributionMap.set(entry.type, {
            count: existing.count + 1,
            score: existing.score + entry.confidence,
        });
    });

    const typeDistribution = Array.from(distributionMap.entries())
        .map(([type, value]) => ({
            type,
            typeLabel: COMPANY_TYPE_LABELS[type],
            count: value.count,
            share: round(value.count / classifiedCompanies.length),
            score: round(value.score),
        }))
        .sort((a, b) => {
            if (b.count !== a.count) return b.count - a.count;
            if (b.score !== a.score) return b.score - a.score;
            return COMPANY_TYPE_PRIORITY.indexOf(a.type) - COMPANY_TYPE_PRIORITY.indexOf(b.type);
        });

    const primary = typeDistribution[0];
    const secondaryCompanyTypes = typeDistribution
        .slice(1)
        .filter((entry) => entry.count >= 1)
        .map((entry) => ({
            type: entry.type,
            typeLabel: entry.typeLabel,
            count: entry.count,
            confidence: round(entry.score / entry.count),
        }));

    return {
        totalCompanies: companyClassifications.length,
        primaryCompanyType: primary.type,
        primaryCompanyTypeLabel: primary.typeLabel,
        primaryConfidence: round(primary.score / primary.count),
        secondaryCompanyTypes,
        companyClassifications,
        typeDistribution,
    };
};
