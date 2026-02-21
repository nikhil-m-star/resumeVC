import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, User, FileText, GitCommitHorizontal, Clock3 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { resumeService } from '@/services/resume.service';
import ContributionGraph from '@/components/version-control/ContributionGraph';
import { createContributionData, buildContributionDataFromVersionLists } from '@/lib/contribution-utils';

const getLatestCommitAt = (versionLists = []) => {
    const allVersions = versionLists.flat();

    return allVersions.reduce((latest, version) => {
        const timestamp = new Date(version?.createdAt || 0).getTime();
        if (!Number.isFinite(timestamp) || timestamp <= 0) return latest;
        if (!latest || timestamp > latest) return timestamp;
        return latest;
    }, null);
};

export default function Profile() {
    const { user } = useAuth();
    const [resumes, setResumes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activityLoading, setActivityLoading] = useState(true);
    const [contributionData, setContributionData] = useState(() => createContributionData({}));
    const [totalCommits, setTotalCommits] = useState(0);
    const [latestCommitAt, setLatestCommitAt] = useState(null);
    const [error, setError] = useState('');

    const refreshActivity = useCallback(async (resumeList) => {
        setActivityLoading(true);
        setError('');

        try {
            const resumesWithVersions = resumeList.filter((resume) => (resume._count?.versions || 0) > 0);
            if (resumesWithVersions.length === 0) {
                setContributionData(createContributionData({}));
                setTotalCommits(0);
                setLatestCommitAt(null);
                return;
            }

            const versionResponses = await Promise.allSettled(
                resumesWithVersions.map((resume) => resumeService.getVersions(resume.id))
            );

            const versionLists = versionResponses
                .filter((response) => response.status === 'fulfilled')
                .map((response) => (Array.isArray(response.value) ? response.value : []));

            setContributionData(buildContributionDataFromVersionLists(versionLists));
            setTotalCommits(versionLists.flat().length);
            setLatestCommitAt(getLatestCommitAt(versionLists));
        } catch (activityError) {
            console.error('Failed to build profile activity', activityError);
            setContributionData(createContributionData({}));
            setTotalCommits(0);
            setLatestCommitAt(null);
            setError('Failed to load contribution activity. Please refresh.');
        } finally {
            setActivityLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadResumes = async () => {
            setLoading(true);
            setError('');

            try {
                const data = await resumeService.getAllResumes();
                setResumes(data);
                await refreshActivity(data);
            } catch (loadError) {
                console.error('Failed to load profile', loadError);
                setError('Failed to load profile data. Please try again.');
                setContributionData(createContributionData({}));
                setTotalCommits(0);
                setLatestCommitAt(null);
                setActivityLoading(false);
            } finally {
                setLoading(false);
            }
        };

        loadResumes();
    }, [refreshActivity]);

    if (loading) {
        return (
            <div className="flex-center h-50vh">
                <Loader2 className="icon-lg animate-spin" />
            </div>
        );
    }

    return (
        <div className="dashboard-layout">
            <div className="dashboard-header">
                <div className="header-content">
                    <div>
                        <h1 className="dashboard-title">Profile</h1>
                        <p className="dashboard-subtitle">Your resume activity timeline and commit streaks</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-main">
                {error && <div className="error-banner mb-4">{error}</div>}

                <div className="profile-stats-grid">
                    <div className="profile-stat-card">
                        <User className="icon-sm" />
                        <div>
                            <p className="profile-stat-label">User</p>
                            <p className="profile-stat-value">{user?.name || 'User'}</p>
                        </div>
                    </div>
                    <div className="profile-stat-card">
                        <FileText className="icon-sm" />
                        <div>
                            <p className="profile-stat-label">Resumes</p>
                            <p className="profile-stat-value">{resumes.length}</p>
                        </div>
                    </div>
                    <div className="profile-stat-card">
                        <GitCommitHorizontal className="icon-sm" />
                        <div>
                            <p className="profile-stat-label">Total commits</p>
                            <p className="profile-stat-value">{totalCommits}</p>
                        </div>
                    </div>
                    <div className="profile-stat-card">
                        <Clock3 className="icon-sm" />
                        <div>
                            <p className="profile-stat-label">Last commit</p>
                            <p className="profile-stat-value profile-stat-value-small">
                                {latestCommitAt ? new Date(latestCommitAt).toLocaleString() : 'No commits yet'}
                            </p>
                        </div>
                    </div>
                </div>

                <ContributionGraph
                    data={contributionData}
                    isLoading={activityLoading}
                    title="Profile Contribution Graph"
                    subtitle="Your commit activity across all resumes"
                />

                <section className="profile-resume-panel">
                    <div className="profile-resume-panel-header">
                        <h2 className="contrib-title">Resume Activity</h2>
                        <p className="contrib-subtitle">Open each resume’s field-level history page</p>
                    </div>

                    <div className="profile-resume-list">
                        {resumes.map((resume) => (
                            <Link key={resume.id} to={`/resumes/${resume.id}/history`} className="profile-resume-item">
                                <div>
                                    <p className="profile-resume-title">{resume.title}</p>
                                    <p className="profile-resume-meta">
                                        {resume._count?.versions || 0} versions • Updated {new Date(resume.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className="profile-resume-cta">View changes</span>
                            </Link>
                        ))}

                        {resumes.length === 0 && (
                            <div className="dashboard-empty-state profile-empty-state">
                                <FileText className="empty-icon" />
                                <h3 className="empty-title">No resumes yet</h3>
                                <p className="empty-desc">Create your first resume to start tracking profile activity.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
