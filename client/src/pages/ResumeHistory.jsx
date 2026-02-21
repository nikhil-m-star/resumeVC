import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { resumeService } from '@/services/resume.service';
import { Button } from '@/components/ui/button';
import ContributionGraph from '@/components/version-control/ContributionGraph';
import { createContributionData, buildContributionDataFromVersions } from '@/lib/contribution-utils';
import { buildFieldChangeCommits, buildFieldHotspots } from '@/lib/resume-history-utils';

const CHANGE_LABELS = {
    added: 'Added',
    removed: 'Removed',
    modified: 'Modified',
};

const formatCommitDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleString();
};

const displayChangeValue = (value) => {
    const safeValue = String(value || '').trim();
    return safeValue || '∅';
};

export default function ResumeHistory() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [resume, setResume] = useState(null);
    const [commits, setCommits] = useState([]);
    const [selectedCommitId, setSelectedCommitId] = useState(null);
    const [contributionData, setContributionData] = useState(() => createContributionData({}));

    useEffect(() => {
        const loadHistory = async () => {
            if (!id) return;

            setLoading(true);
            setError('');

            try {
                const [resumeDetails, versions] = await Promise.all([
                    resumeService.getResume(id),
                    resumeService.getVersions(id),
                ]);

                const fieldChangeCommits = buildFieldChangeCommits(versions);

                setResume(resumeDetails);
                setCommits(fieldChangeCommits);
                setSelectedCommitId(fieldChangeCommits[0]?.id || null);
                setContributionData(buildContributionDataFromVersions(versions));
            } catch (loadError) {
                console.error('Failed to load resume history', loadError);
                setError('Failed to load this resume history. Please go back and try again.');
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, [id]);

    const selectedCommit = useMemo(() => {
        return commits.find((commit) => commit.id === selectedCommitId) || commits[0] || null;
    }, [commits, selectedCommitId]);

    const fieldHotspots = useMemo(() => {
        return buildFieldHotspots(commits).slice(0, 8);
    }, [commits]);

    const latestCommit = commits[0] || null;

    const totalFieldsTouched = useMemo(() => {
        const fieldSet = new Set();

        commits.forEach((commit) => {
            commit.changes.forEach((change) => fieldSet.add(change.field));
        });

        return fieldSet.size;
    }, [commits]);

    if (loading) {
        return (
            <div className="flex-center h-50vh">
                <Loader2 className="icon-lg animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-layout">
                <div className="dashboard-main">
                    <div className="error-banner mb-4">{error}</div>
                    <Button variant="outline" onClick={() => navigate('/dashboard')}>
                        <ArrowLeft className="icon-sm mr-2" /> Back to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-layout resume-history-layout">
            <div className="dashboard-header">
                <div className="header-content resume-history-header">
                    <div>
                        <p className="resume-history-kicker">Resume History</p>
                        <h1 className="dashboard-title">{resume?.title || 'Resume'}</h1>
                        <p className="dashboard-subtitle">Field-by-field commit history, similar to GitHub change tracking</p>
                    </div>
                    <div className="resume-history-header-actions">
                        <Button variant="outline" onClick={() => navigate('/dashboard')}>
                            <ArrowLeft className="icon-sm mr-2" /> Dashboard
                        </Button>
                        <Button onClick={() => navigate(`/editor/${id}`)}>Open Editor</Button>
                    </div>
                </div>
            </div>

            <div className="dashboard-main">
                <div className="profile-stats-grid">
                    <div className="profile-stat-card">
                        <div>
                            <p className="profile-stat-label">Total commits</p>
                            <p className="profile-stat-value">{commits.length}</p>
                        </div>
                    </div>
                    <div className="profile-stat-card">
                        <div>
                            <p className="profile-stat-label">Unique fields touched</p>
                            <p className="profile-stat-value">{totalFieldsTouched}</p>
                        </div>
                    </div>
                    <div className="profile-stat-card">
                        <div>
                            <p className="profile-stat-label">Latest commit</p>
                            <p className="profile-stat-value profile-stat-value-small">
                                {latestCommit ? formatCommitDate(latestCommit.createdAt) : 'No commits yet'}
                            </p>
                        </div>
                    </div>
                </div>

                <ContributionGraph
                    data={contributionData}
                    isLoading={false}
                    title="Resume Contribution Graph"
                    subtitle="Commit activity for this resume"
                />

                <div className="resume-history-content-grid">
                    <section className="resume-history-panel">
                        <div className="resume-history-panel-header">
                            <h2 className="contrib-title">Commits</h2>
                            <p className="contrib-subtitle">Select a commit to inspect changed fields</p>
                        </div>

                        {commits.length === 0 ? (
                            <div className="contrib-loading">No commits yet. Create a version from the editor first.</div>
                        ) : (
                            <div className="resume-commit-list">
                                {commits.map((commit) => (
                                    <button
                                        key={commit.id}
                                        type="button"
                                        className={`resume-commit-item ${selectedCommit?.id === commit.id ? 'active' : ''}`}
                                        onClick={() => setSelectedCommitId(commit.id)}
                                    >
                                        <div className="resume-commit-top">
                                            <p className="resume-commit-message">{commit.message}</p>
                                            <span className="resume-commit-version">v{commit.version || '-'}</span>
                                        </div>
                                        <p className="resume-commit-meta">{formatCommitDate(commit.createdAt)} • {commit.hash}</p>
                                        <div className="resume-commit-stats">
                                            <span className="commit-pill added">+{commit.stats.added}</span>
                                            <span className="commit-pill modified">~{commit.stats.modified}</span>
                                            <span className="commit-pill removed">-{commit.stats.removed}</span>
                                        </div>
                                        <p className="resume-commit-fields">
                                            {commit.totalChangedFields} changed field{commit.totalChangedFields === 1 ? '' : 's'}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="resume-history-panel">
                        <div className="resume-history-panel-header">
                            <h2 className="contrib-title">Field Changes</h2>
                            <p className="contrib-subtitle">
                                {selectedCommit
                                    ? `${selectedCommit.totalChangedFields} field${selectedCommit.totalChangedFields === 1 ? '' : 's'} changed`
                                    : 'Select a commit to view details'}
                            </p>
                        </div>

                        {!selectedCommit ? (
                            <div className="contrib-loading">No commit selected.</div>
                        ) : selectedCommit.totalChangedFields === 0 ? (
                            <div className="contrib-loading">This commit has no field-level changes.</div>
                        ) : (
                            <div className="field-change-list">
                                {selectedCommit.changes.map((change) => (
                                    <article key={`${selectedCommit.id}-${change.field}`} className="field-change-item">
                                        <div className="field-change-heading">
                                            <span className={`field-change-tag ${change.type}`}>{CHANGE_LABELS[change.type]}</span>
                                            <code className="field-change-path">{change.field}</code>
                                        </div>
                                        <div className="field-change-values">
                                            <div className="field-change-box">
                                                <span className="field-change-label">Before</span>
                                                <p className="field-change-value">{displayChangeValue(change.before)}</p>
                                            </div>
                                            <div className="field-change-box">
                                                <span className="field-change-label">After</span>
                                                <p className="field-change-value">{displayChangeValue(change.after)}</p>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                <section className="resume-history-panel">
                    <div className="resume-history-panel-header">
                        <h2 className="contrib-title">Most Changed Fields</h2>
                        <p className="contrib-subtitle">Fields edited the most across this resume’s history</p>
                    </div>

                    {fieldHotspots.length === 0 ? (
                        <div className="contrib-loading">No field activity yet.</div>
                    ) : (
                        <div className="field-hotspot-list">
                            {fieldHotspots.map((hotspot) => (
                                <div key={hotspot.field} className="field-hotspot-item">
                                    <code className="field-hotspot-field">{hotspot.field}</code>
                                    <div className="field-hotspot-metrics">
                                        <span>{hotspot.count} change{hotspot.count === 1 ? '' : 's'}</span>
                                        <span>+{hotspot.added}</span>
                                        <span>~{hotspot.modified}</span>
                                        <span>-{hotspot.removed}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
