import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, Clock, MoreVertical, Loader2 } from 'lucide-react';
import { resumeService } from '@/services/resume.service';
import { Button } from '@/components/ui/button';
import ContributionGraph from '@/components/version-control/ContributionGraph';
import { createContributionData, buildContributionDataFromVersionLists } from '@/lib/contribution-utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const buildContributionData = async (resumes) => {
    const resumesWithVersions = resumes.filter((resume) => (resume._count?.versions || 0) > 0);

    if (resumesWithVersions.length === 0) {
        return createContributionData({});
    }

    const versionResponses = await Promise.allSettled(
        resumesWithVersions.map((resume) => resumeService.getVersions(resume.id))
    );

    const versionLists = [];

    versionResponses.forEach((response) => {
        if (response.status !== 'fulfilled') return;
        versionLists.push(Array.isArray(response.value) ? response.value : []);
    });

    return buildContributionDataFromVersionLists(versionLists);
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
                <ContributionGraph
                    data={contributionData}
                    isLoading={activityLoading}
                    title="Resume Contribution Graph"
                    subtitle="Activity from your version commits across all resumes"
                />

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
                                        <DropdownMenuItem onClick={() => navigate(`/resumes/${resume.id}/history`)}>
                                            View Changes
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
                            <Link to={`/resumes/${resume.id}/history`} className="resume-history-link">
                                View field-level history
                            </Link>
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
