import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, Building2, Target, CheckCircle2, Wand2 } from 'lucide-react';
import { resumeService } from '@/services/resume.service';
import { BUILTIN_RESUME_CATEGORIES, DEFAULT_RESUME_CATEGORY } from '@/constants/resume-categories';
import { Button } from '@/components/ui/button';

const getSafeArray = (value) => (Array.isArray(value) ? value : []);

export default function Recommendations() {
    const navigate = useNavigate();
    const [targetCompany, setTargetCompany] = useState('');
    const [targetCategory, setTargetCategory] = useState(DEFAULT_RESUME_CATEGORY);
    const [categories, setCategories] = useState(BUILTIN_RESUME_CATEGORIES);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    // Sample generation state
    const [sampleCategory, setSampleCategory] = useState(DEFAULT_RESUME_CATEGORY);
    const [sampleLoading, setSampleLoading] = useState(false);
    const [sampleError, setSampleError] = useState('');
    const [sampleSuccess, setSampleSuccess] = useState(null);

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

    const handleGenerateSample = async () => {
        setSampleLoading(true);
        setSampleError('');
        setSampleSuccess(null);
        try {
            const newResume = await resumeService.generateSampleResume(sampleCategory);
            setSampleSuccess(newResume);
        } catch (err) {
            console.error('Failed to generate sample', err);
            const msg = err?.response?.data?.message || err?.message || 'Failed to generate sample resume.';
            setSampleError(msg);
        } finally {
            setSampleLoading(false);
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

                <section className="resume-history-panel recommendation-panel">
                    <div className="resume-history-panel-header">
                        <h2 className="contrib-title">Generate Sample Resume</h2>
                        <p className="contrib-subtitle">Don't have resumes yet? AI will create a realistic one for you to test recommendations.</p>
                    </div>
                    <div className="recommendation-form">
                        <div className="editor-grid-2">
                            <div className="editor-form-group">
                                <label htmlFor="sample-category" className="editor-label">Category</label>
                                <select
                                    id="sample-category"
                                    className="input"
                                    value={sampleCategory}
                                    onChange={(e) => setSampleCategory(e.target.value)}
                                >
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="editor-form-group" style={{ justifyContent: 'flex-end' }}>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleGenerateSample}
                                    disabled={sampleLoading}
                                >
                                    {sampleLoading ? (
                                        <><Loader2 className="icon-sm mr-2 animate-spin" /> Generating...</>
                                    ) : (
                                        <><Wand2 className="icon-sm mr-2" /> Generate Sample</>
                                    )}
                                </Button>
                            </div>
                        </div>
                        {sampleError && <div className="error-banner mt-4">{sampleError}</div>}
                        {sampleSuccess && (
                            <div className="recommendation-form" style={{ marginTop: '1rem' }}>
                                <p style={{ fontSize: '0.9rem' }}>
                                    ✅ Created <strong>{sampleSuccess.title}</strong>
                                </p>
                                <div className="flex gap-2" style={{ marginTop: '0.5rem' }}>
                                    <Button size="sm" onClick={() => navigate(`/editor/${sampleSuccess.id}`)}>
                                        Open in Editor
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => navigate('/dashboard')}>
                                        Go to Dashboard
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
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
