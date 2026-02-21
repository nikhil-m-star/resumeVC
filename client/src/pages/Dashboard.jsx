import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, Clock, MoreVertical, Loader2, GitCommitHorizontal, CalendarDays, Flame } from 'lucide-react';
import { resumeService } from '@/services/resume.service';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const WEEKS_TO_SHOW = 20;
const DAYS_TO_SHOW = WEEKS_TO_SHOW * 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const toDateKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const local = new Date(date);
    local.setHours(0, 0, 0, 0);
    const year = local.getFullYear();
    const month = String(local.getMonth() + 1).padStart(2, '0');
    const day = String(local.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getContributionLevel = (count, maxCount) => {
    if (count <= 0 || maxCount <= 0) return 0;
    if (maxCount === 1) return 4;

    const ratio = count / maxCount;
    if (ratio < 0.25) return 1;
    if (ratio < 0.5) return 2;
    if (ratio < 0.75) return 3;
    return 4;
};

const calculateStreak = (countsByDate, startDate, endDate) => {
    let streak = 0;
    const cursor = new Date(endDate);

    while (cursor >= startDate) {
        const key = toDateKey(cursor);
        if (!key || !countsByDate[key]) break;
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
};

const createContributionData = (countsByDate = {}) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (DAYS_TO_SHOW - 1));

    const gridStart = new Date(startDate);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    const totalGridDays = Math.floor((today.getTime() - gridStart.getTime()) / DAY_MS) + 1;

    let totalCommits = 0;
    let activeDays = 0;
    let maxCommits = 0;

    const rawCells = Array.from({ length: totalGridDays }).map((_, index) => {
        const date = new Date(gridStart);
        date.setDate(gridStart.getDate() + index);

        const inRange = date >= startDate && date <= today;
        const dateKey = toDateKey(date);
        const count = inRange && dateKey ? (countsByDate[dateKey] || 0) : 0;

        if (inRange) {
            totalCommits += count;
            if (count > 0) activeDays += 1;
            if (count > maxCommits) maxCommits = count;
        }

        return {
            dateKey,
            count,
            inRange,
        };
    });

    const cells = rawCells.map((cell) => ({
        ...cell,
        level: cell.inRange ? getContributionLevel(cell.count, maxCommits) : 0,
    }));

    return {
        cells,
        totalCommits,
        activeDays,
        maxCommits,
        streak: calculateStreak(countsByDate, startDate, today),
    };
};

const buildContributionData = async (resumes) => {
    const resumesWithVersions = resumes.filter((resume) => (resume._count?.versions || 0) > 0);

    if (resumesWithVersions.length === 0) {
        return createContributionData({});
    }

    const versionResponses = await Promise.allSettled(
        resumesWithVersions.map((resume) => resumeService.getVersions(resume.id))
    );

    const countsByDate = {};

    versionResponses.forEach((response) => {
        if (response.status !== 'fulfilled') return;

        const versions = Array.isArray(response.value) ? response.value : [];
        versions.forEach((version) => {
            const dateKey = toDateKey(version?.createdAt);
            if (!dateKey) return;
            countsByDate[dateKey] = (countsByDate[dateKey] || 0) + 1;
        });
    });

    return createContributionData(countsByDate);
};

export default function Dashboard() {
    const [resumes, setResumes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activityLoading, setActivityLoading] = useState(true);
    const [contributionData, setContributionData] = useState(() => createContributionData({}));
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [resumeToDelete, setResumeToDelete] = useState(null);
    const [deleteError, setDeleteError] = useState('');
    const navigate = useNavigate();

    const refreshContributionGraph = useCallback(async (resumeList) => {
        setActivityLoading(true);
        try {
            const graphData = await buildContributionData(resumeList);
            setContributionData(graphData);
        } catch (error) {
            console.error('Failed to build contribution graph', error);
            setContributionData(createContributionData({}));
        } finally {
            setActivityLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadResumes = async () => {
            try {
                const data = await resumeService.getAllResumes();
                setResumes(data);
                await refreshContributionGraph(data);
            } catch (error) {
                console.error('Failed to fetch resumes', error);
            } finally {
                setLoading(false);
            }
        };

        loadResumes();
    }, [refreshContributionGraph]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        setCreateError('');
        try {
            const newResume = await resumeService.createResume({
                title: newTitle,
                description: 'Created via ResumeForge',
                isPublic: false
            });
            setIsCreateOpen(false);
            setNewTitle('');
            setCreateError('');
            navigate(`/editor/${newResume.id}`);
        } catch (error) {
            console.error('Failed to create resume', error);
            const msg = error?.response?.data?.message || error?.message || 'Failed to create resume. Check if the backend is running.';
            setCreateError(msg);
        } finally {
            setCreateLoading(false);
        }
    };

    const openDeleteDialog = (resume) => {
        setResumeToDelete(resume);
        setDeleteError('');
        setIsDeleteOpen(true);
    };

    const closeDeleteDialog = () => {
        if (deletingId) return;
        setIsDeleteOpen(false);
        setResumeToDelete(null);
        setDeleteError('');
    };

    const handleDelete = async () => {
        const resumeId = resumeToDelete?.id;
        if (!resumeId) return;

        setDeletingId(resumeId);
        setDeleteError('');
        try {
            await resumeService.deleteResume(resumeId);
            const nextResumes = resumes.filter((resume) => resume.id !== resumeId);
            setResumes(nextResumes);
            await refreshContributionGraph(nextResumes);
            setIsDeleteOpen(false);
            setResumeToDelete(null);
        } catch (error) {
            console.error('Failed to delete resume', error);
            const msg = error?.response?.data?.message || error?.message || 'Failed to delete resume';
            setDeleteError(msg);
        } finally {
            setDeletingId(null);
        }
    };

    const isDeletingSelectedResume = Boolean(
        deletingId && resumeToDelete && deletingId === resumeToDelete.id
    );

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
                        <h1 className="dashboard-title">Dashboard</h1>
                        <p className="dashboard-subtitle">Manage your resumes and versions with GitHub-style tracking</p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="icon-sm mr-2" /> New Resume
                    </Button>
                </div>
            </div>

            <div className="dashboard-main">
                <section className="contrib-panel">
                    <div className="contrib-panel-header">
                        <div>
                            <h2 className="contrib-title">Resume Contribution Graph</h2>
                            <p className="contrib-subtitle">Activity from your version commits across all resumes</p>
                        </div>
                        <span className="contrib-range">Last {WEEKS_TO_SHOW} weeks</span>
                    </div>

                    <div className="contrib-stats">
                        <div className="contrib-stat-card">
                            <GitCommitHorizontal className="icon-sm" />
                            <div>
                                <p className="contrib-stat-label">Total commits</p>
                                <p className="contrib-stat-value">{contributionData.totalCommits}</p>
                            </div>
                        </div>
                        <div className="contrib-stat-card">
                            <CalendarDays className="icon-sm" />
                            <div>
                                <p className="contrib-stat-label">Active days</p>
                                <p className="contrib-stat-value">{contributionData.activeDays}</p>
                            </div>
                        </div>
                        <div className="contrib-stat-card">
                            <Flame className="icon-sm" />
                            <div>
                                <p className="contrib-stat-label">Current streak</p>
                                <p className="contrib-stat-value">{contributionData.streak} day{contributionData.streak === 1 ? '' : 's'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="contrib-grid-shell">
                        {activityLoading ? (
                            <div className="contrib-loading">Building contribution graph...</div>
                        ) : (
                            <>
                                <div className="contrib-grid">
                                    {contributionData.cells.map((cell, index) => {
                                        const tooltipDate = cell.dateKey
                                            ? new Date(`${cell.dateKey}T00:00:00`).toLocaleDateString()
                                            : '';
                                        const tooltip = cell.inRange
                                            ? `${cell.count} commit${cell.count === 1 ? '' : 's'} on ${tooltipDate}`
                                            : '';

                                        return (
                                            <span
                                                key={`${cell.dateKey || 'empty'}-${index}`}
                                                className={`contrib-cell level-${cell.level} ${cell.inRange ? '' : 'outside'}`}
                                                title={tooltip}
                                            />
                                        );
                                    })}
                                </div>
                                <div className="contrib-legend">
                                    <span>Less</span>
                                    <span className="contrib-cell level-0" />
                                    <span className="contrib-cell level-1" />
                                    <span className="contrib-cell level-2" />
                                    <span className="contrib-cell level-3" />
                                    <span className="contrib-cell level-4" />
                                    <span>More</span>
                                </div>
                            </>
                        )}
                    </div>
                </section>

                <div className="resume-grid">
                    {resumes.map((resume) => (
                        <div key={resume.id} className="resume-card group">
                            <div className="resume-card-header">
                                <Link to={`/editor/${resume.id}`} className="block flex-1">
                                    <div className="resume-icon-wrapper">
                                        <FileText className="icon-md" />
                                    </div>
                                    <h3 className="resume-title">{resume.title}</h3>
                                </Link>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="btn-icon-more">
                                            <MoreVertical className="icon-sm" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => navigate(`/editor/${resume.id}`)}>
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={() => openDeleteDialog(resume)}
                                            disabled={deletingId === resume.id}
                                        >
                                            {deletingId === resume.id ? 'Deleting...' : 'Delete'}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="resume-meta">
                                <Clock className="icon-xs mr-1" />
                                <span>Edited {new Date(resume.updatedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="resume-version-count">
                                {resume._count?.versions || 0} versions
                            </div>
                        </div>
                    ))}

                    {resumes.length === 0 && (
                        <div className="dashboard-empty-state">
                            <FileText className="empty-icon" />
                            <h3 className="empty-title">No resumes yet</h3>
                            <p className="empty-desc">
                                Create your first resume to start building your career history with version control.
                            </p>
                            <Button onClick={() => setIsCreateOpen(true)}>
                                Create Resume
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {isCreateOpen && (
                <div className="dialog-overlay">
                    <div className="dialog-content">
                        <div className="dialog-header">
                            <h2 className="dialog-title">Create New Resume</h2>
                            <p className="dialog-description">Give your resume a name to get started.</p>
                        </div>
                        <form onSubmit={handleCreate}>
                            {createError && <div className="error-banner">{createError}</div>}
                            <div className="form-group py-4">
                                <div className="grid gap-2">
                                    <label htmlFor="title" className="form-label">Resume Title</label>
                                    <input
                                        id="title"
                                        className="input"
                                        placeholder="e.g. Software Engineer 2024"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="dialog-footer">
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={!newTitle || createLoading}>
                                    {createLoading && <Loader2 className="icon-sm animate-spin mr-2" />}
                                    Create
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDeleteOpen && resumeToDelete && (
                <div className="dialog-overlay">
                    <div className="dialog-content" role="dialog" aria-modal="true" aria-labelledby="delete-resume-title">
                        <div className="dialog-header">
                            <h2 id="delete-resume-title" className="dialog-title">Delete Resume</h2>
                            <p className="dialog-description">
                                Delete "{resumeToDelete.title}"? This action cannot be undone.
                            </p>
                        </div>
                        {deleteError && <div className="error-banner">{deleteError}</div>}
                        <div className="dialog-footer">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeDeleteDialog}
                                disabled={isDeletingSelectedResume}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isDeletingSelectedResume}
                            >
                                {isDeletingSelectedResume && <Loader2 className="icon-sm animate-spin mr-2" />}
                                {isDeletingSelectedResume ? 'Deleting...' : 'Delete Resume'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
