import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Sparkles, Building2, Target, CheckCircle2 } from 'lucide-react';
import { resumeService } from '@/services/resume.service';
import { BUILTIN_RESUME_CATEGORIES, DEFAULT_RESUME_CATEGORY } from '@/constants/resume-categories';
import { Button } from '@/components/ui/button';

const getSafeArray = (value) => (Array.isArray(value) ? value : []);

export default function Recommendations() {
    const [targetCompany, setTargetCompany] = useState('');
    const [targetCategory, setTargetCategory] = useState(DEFAULT_RESUME_CATEGORY);
    const [categories, setCategories] = useState(BUILTIN_RESUME_CATEGORIES);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const response = await resumeService.getRecommendationCategories();
                const incomingCategories = getSafeArray(response?.categories);
                if (incomingCategories.length > 0) {
                    setCategories(incomingCategories);
                    setTargetCategory((previousCategory) =>
                        incomingCategories.includes(previousCategory)
                            ? previousCategory
                            : (response?.defaultCategory || incomingCategories[0])
                    );
                }
            } catch (categoryError) {
                console.error('Failed to load recommendation categories', categoryError);
            }
        };

        loadCategories();
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        setResult(null);

        try {
            const recommendation = await resumeService.getResumeRecommendation({
                targetCompany: targetCompany.trim(),
                targetCategory,
            });
            setResult(recommendation);
        } catch (requestError) {
            console.error('Failed to fetch recommendation', requestError);
            const message =
                requestError?.response?.data?.message ||
                requestError?.response?.data?.errors?.[0]?.message ||
                'Unable to generate recommendation right now.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const recommendation = result?.recommended;

    return (
        <div className="dashboard-layout">
            <div className="dashboard-header">
                <div className="header-content">
                    <div>
                        <h1 className="dashboard-title">AI Resume Recommendations</h1>
                        <p className="dashboard-subtitle">
                            Target a company and category to get the best resume version and improvement suggestions.
                        </p>
                    </div>
                </div>
            </div>

            <div className="dashboard-main recommendation-main">
                <section className="resume-history-panel recommendation-panel">
                    <div className="resume-history-panel-header">
                        <h2 className="contrib-title">Find Best Resume Version</h2>
                        <p className="contrib-subtitle">Uses Groq when configured, with deterministic fallback scoring.</p>
                    </div>

                    <form className="recommendation-form" onSubmit={handleSubmit}>
                        <div className="editor-grid-2">
                            <div className="editor-form-group">
                                <label htmlFor="target-company" className="editor-label">Target Company</label>
                                <input
                                    id="target-company"
                                    className="input"
                                    placeholder="e.g. Stripe, Google, Atlassian"
                                    value={targetCompany}
                                    onChange={(event) => setTargetCompany(event.target.value)}
                                    required
                                />
                            </div>
                            <div className="editor-form-group">
                                <label htmlFor="target-category" className="editor-label">Resume Category</label>
                                <select
                                    id="target-category"
                                    className="input"
                                    value={targetCategory}
                                    onChange={(event) => setTargetCategory(event.target.value)}
                                >
                                    {categories.map((category) => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <Button type="submit" disabled={loading || targetCompany.trim().length < 2}>
                            {loading ? (
                                <>
                                    <Loader2 className="icon-sm mr-2 animate-spin" /> Generating Recommendation
                                </>
                            ) : (
                                <>
                                    <Sparkles className="icon-sm mr-2" /> Recommend Best Version
                                </>
                            )}
                        </Button>
                    </form>

                    {error && <div className="error-banner mt-4">{error}</div>}
                </section>

                {result && recommendation && (
                    <div className="recommendation-results-grid">
                        <section className="resume-history-panel recommendation-highlight">
                            <div className="recommendation-highlight-header">
                                <div>
                                    <p className="resume-history-kicker">Best Match</p>
                                    <h2 className="contrib-title">{recommendation.resumeTitle}</h2>
                                    <p className="contrib-subtitle">{recommendation.versionLabel} • {recommendation.resumeCategory}</p>
                                </div>
                                <div className="recommendation-fit-pill">
                                    <Target className="icon-sm" />
                                    <span>{result.fitScore}% fit</span>
                                </div>
                            </div>

                            <p className="recommendation-reasoning">{result.reasoning}</p>

                            <div className="recommendation-meta-row">
                                <span><Building2 className="icon-xs" /> Company: {result.targetCompany}</span>
                                <span><CheckCircle2 className="icon-xs" /> Category: {result.targetCategory}</span>
                                <span>{result.usedModel ? 'Groq model used' : 'Fallback heuristic used'}</span>
                            </div>

                            <div className="recommendation-actions">
                                <Link to={`/editor/${recommendation.resumeId}`}>
                                    <Button>Open Recommended Resume</Button>
                                </Link>
                                <Link to={`/resumes/${recommendation.resumeId}/history`}>
                                    <Button variant="outline">Open History</Button>
                                </Link>
                            </div>
                        </section>

                        <section className="resume-history-panel">
                            <div className="resume-history-panel-header">
                                <h2 className="contrib-title">What To Fill (Category)</h2>
                            </div>
                            <ul className="recommendation-list">
                                {getSafeArray(result.categoryRecommendations).map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </section>

                        <section className="resume-history-panel">
                            <div className="resume-history-panel-header">
                                <h2 className="contrib-title">Company-Specific Recommendations</h2>
                            </div>
                            <ul className="recommendation-list">
                                {getSafeArray(result.companySpecificRecommendations).map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </section>

                        <section className="resume-history-panel">
                            <div className="resume-history-panel-header">
                                <h2 className="contrib-title">Missing Content To Add</h2>
                            </div>
                            <ul className="recommendation-list">
                                {getSafeArray(result.missingResumeContent).map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
