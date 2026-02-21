export const BUILTIN_RESUME_CATEGORIES = [
    'General',
    'Software Engineering',
    'Frontend',
    'Backend',
    'Full Stack',
    'Data Science',
    'Machine Learning',
    'DevOps',
    'Cloud',
    'Cybersecurity',
    'Product Management',
    'UI/UX Design',
    'QA / Testing',
    'Mobile Development',
    'Internship',
] as const;

export const DEFAULT_RESUME_CATEGORY = 'General';

export const CATEGORY_RESUME_GUIDANCE: Record<string, string[]> = {
    General: [
        'Write a focused 2-3 line summary with role, years of experience, and top domain expertise.',
        'Keep experience bullets impact-first: action + scope + measurable result.',
        'Prioritize recent and relevant projects with clear ownership and outcomes.',
        'Include technical stack with depth, not just tool names.',
        'Add links: LinkedIn, GitHub/portfolio, and relevant project demos.',
    ],
    'Software Engineering': [
        'Show system design impact: scale, performance, reliability, and architecture decisions.',
        'Include quantifiable metrics such as latency reduction, uptime improvement, or cost savings.',
        'Highlight ownership across design, implementation, testing, rollout, and monitoring.',
        'Call out collaboration with product/design and cross-team execution.',
        'List core strengths such as APIs, distributed systems, and data modeling.',
    ],
    Frontend: [
        'Show UI impact with metrics: conversion, engagement, accessibility, and performance.',
        'Highlight component architecture, state management, and design system contributions.',
        'Add examples of cross-browser support and responsive implementation quality.',
        'Mention frontend testing strategy: unit, integration, and E2E coverage.',
        'Include modern tooling and optimization work (bundles, rendering, caching).',
    ],
    Backend: [
        'Emphasize APIs, data modeling, scalability, and reliability improvements.',
        'Provide concrete throughput/latency/error-rate metrics.',
        'Include security, observability, and incident-response contributions.',
        'Call out queueing, caching, and database optimization work.',
        'Show architecture ownership and migration experience.',
    ],
    'Full Stack': [
        'Present end-to-end ownership from UX flow to backend services and deployment.',
        'Connect product outcomes to technical implementation choices.',
        'Show balanced depth in frontend architecture and backend scalability.',
        'Highlight cross-functional delivery and fast iteration loops.',
        'Include 2-3 shipped features with measurable business impact.',
    ],
    'Data Science': [
        'Describe business problem framing, hypothesis, and measurable impact.',
        'Include dataset size, methods used, and evaluation metrics.',
        'Highlight experimentation and A/B testing rigor.',
        'Show communication of insights to non-technical stakeholders.',
        'Mention productionization of models or analytics pipelines where relevant.',
    ],
    'Machine Learning': [
        'List model objectives, constraints, and evaluation metrics clearly.',
        'Describe training/serving pipeline and MLOps practices.',
        'Highlight feature engineering and model iteration methodology.',
        'Include production impact: accuracy lift, false positive reduction, latency.',
        'Show collaboration with platform, product, and domain teams.',
    ],
    DevOps: [
        'Show infrastructure reliability gains: uptime, MTTR, deployment frequency.',
        'Highlight CI/CD pipelines, IaC, and release automation.',
        'Include observability stack and on-call improvements.',
        'Demonstrate cost optimization and cloud resource governance.',
        'Mention security and compliance automation where applicable.',
    ],
    Cloud: [
        'Focus on cloud architecture, migration strategy, and resiliency.',
        'Quantify availability, latency, and cost improvements.',
        'Include containerization, orchestration, and service networking.',
        'Show multi-environment deployment and infrastructure automation.',
        'Highlight governance, security controls, and disaster recovery.',
    ],
    Cybersecurity: [
        'Highlight threat modeling, remediation, and risk reduction outcomes.',
        'Include security tooling, incident response, and vulnerability management.',
        'Show secure development lifecycle contributions.',
        'Demonstrate compliance controls and audit readiness support.',
        'Quantify impact with reduced incidents, improved detection, or faster response.',
    ],
    'Product Management': [
        'Lead with product outcomes and customer/business impact.',
        'Show prioritization frameworks and roadmap ownership.',
        'Include cross-functional execution with engineering and design.',
        'Highlight experiment-driven decisions and KPI movement.',
        'Show communication with stakeholders and tradeoff management.',
    ],
    'UI/UX Design': [
        'Show user research inputs and how insights informed design decisions.',
        'Include usability outcomes and measurable UX improvements.',
        'Highlight design system and component library contributions.',
        'Show collaboration with product and engineering for shipped work.',
        'Add portfolio links with concise project context and outcomes.',
    ],
    'QA / Testing': [
        'Show quality strategy across manual, automation, and regression coverage.',
        'Include defect leakage reduction and test-cycle efficiency gains.',
        'Highlight CI-integrated test automation and reliability practices.',
        'Mention risk-based planning and release confidence improvements.',
        'Show collaboration to improve definition of done and quality gates.',
    ],
    'Mobile Development': [
        'Emphasize app performance, crash-free sessions, and user retention metrics.',
        'Highlight platform expertise, release lifecycle, and store deployment.',
        'Include offline handling, synchronization, and device compatibility work.',
        'Show UX quality improvements and accessibility considerations.',
        'Mention analytics-driven iteration on user flows and engagement.',
    ],
    Internship: [
        'Keep bullets concise and impact-oriented even for short project timelines.',
        'Highlight learning speed, ownership, and shipped outcomes.',
        'Emphasize academic projects aligned to the target role.',
        'Show mentorship collaboration and code quality practices.',
        'Include skills actually used in production or major projects.',
    ],
};

const normalize = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
};

const NORMALIZED_CATEGORY_LOOKUP = Object.fromEntries(
    BUILTIN_RESUME_CATEGORIES.map((category) => [normalize(category), category])
);

export const resolveBuiltinCategory = (value?: string | null): string => {
    const normalized = normalize(value);
    return NORMALIZED_CATEGORY_LOOKUP[normalized] || DEFAULT_RESUME_CATEGORY;
};

export const getCategoryGuidance = (category?: string | null): string[] => {
    const resolved = resolveBuiltinCategory(category);
    return CATEGORY_RESUME_GUIDANCE[resolved] || CATEGORY_RESUME_GUIDANCE[DEFAULT_RESUME_CATEGORY];
};
