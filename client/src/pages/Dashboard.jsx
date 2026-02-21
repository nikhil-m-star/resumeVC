import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, Clock, MoreVertical, Loader2 } from 'lucide-react';
import { resumeService } from '@/services/resume.service';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const DEFAULT_RESUME_CATEGORY = 'General';
const DASHBOARD_RESUMES_CACHE_KEY = 'resumevc-dashboard-resumes-v1';

const normalizeCategory = (category) => {
    if (typeof category !== 'string') return DEFAULT_RESUME_CATEGORY;
    const normalized = category.trim();
    return normalized.length > 0 ? normalized : DEFAULT_RESUME_CATEGORY;
};

const sortByMostRecent = (a, b) => {
    const aTime = new Date(a?.updatedAt || 0).getTime();
    const bTime = new Date(b?.updatedAt || 0).getTime();
    return bTime - aTime;
};

const groupResumesByCategory = (resumeList) => {
    const groups = new Map();

    resumeList.forEach((resume) => {
        const category = normalizeCategory(resume?.category);
        if (!groups.has(category)) {
            groups.set(category, []);
        }
        groups.get(category).push(resume);
    });

    return Array.from(groups.entries())
        .map(([category, resumes]) => ({
            category,
            resumes: [...resumes].sort(sortByMostRecent),
        }))
        .sort((a, b) => a.category.localeCompare(b.category));
};

const getResumeCountLabel = (count) => `${count} resume${count === 1 ? '' : 's'}`;

const readCachedResumes = () => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(DASHBOARD_RESUMES_CACHE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeCachedResumes = (resumeList) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(DASHBOARD_RESUMES_CACHE_KEY, JSON.stringify(resumeList));
    } catch {
        // Ignore cache write failures and keep dashboard functional.
    }
};

export default function Dashboard() {
    const [resumes, setResumes] = useState(() => readCachedResumes());
    const [loading, setLoading] = useState(() => readCachedResumes().length === 0);
    const [viewMode, setViewMode] = useState('recent');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newCategory, setNewCategory] = useState(DEFAULT_RESUME_CATEGORY);
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [resumeToDelete, setResumeToDelete] = useState(null);
    const [deleteError, setDeleteError] = useState('');
    const hasCachedResumesRef = useRef(resumes.length > 0);
    const navigate = useNavigate();

    useEffect(() => {
        const loadResumes = async () => {
            if (!hasCachedResumesRef.current) {
                setLoading(true);
            }
            try {
                const data = await resumeService.getAllResumes();
                const nextResumes = Array.isArray(data) ? data : [];
                setResumes(nextResumes);
                writeCachedResumes(nextResumes);
            } catch (error) {
                console.error('Failed to fetch resumes', error);
                if (!hasCachedResumesRef.current) {
                    setResumes([]);
                }
            } finally {
                setLoading(false);
            }
        };

        loadResumes();
    }, []);

    const sortedResumes = useMemo(() => {
        return [...resumes].sort(sortByMostRecent);
    }, [resumes]);

    const categoryGroups = useMemo(() => {
        return groupResumesByCategory(sortedResumes);
    }, [sortedResumes]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        setCreateError('');
        try {
            const newResume = await resumeService.createResume({
                title: newTitle.trim(),
                category: normalizeCategory(newCategory),
                description: 'Created via ResumeForge',
                isPublic: false,
            });
            setIsCreateOpen(false);
            setNewTitle('');
            setNewCategory(DEFAULT_RESUME_CATEGORY);
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
            writeCachedResumes(nextResumes);
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

    const renderResumeCard = (resume) => (
        <div key={resume.id} className="resume-card group">
            <div className="resume-card-header">
                <Link to={`/editor/${resume.id}`} className="block flex-1">
                    <div className="resume-icon-wrapper">
                        <FileText className="icon-md" />
                    </div>
                    <h3 className="resume-title">{resume.title}</h3>
                    <div className="resume-card-category-row">
                        <span className="resume-category-pill">{normalizeCategory(resume.category)}</span>
                    </div>
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
                        <p className="dashboard-subtitle">Manage resumes by category or recent updates.</p>
                    </div>
                    <div className="dashboard-actions">
                        <div className="dashboard-view-toggle">
                            <Button
                                type="button"
                                size="sm"
                                variant={viewMode === 'recent' ? 'default' : 'outline'}
                                onClick={() => setViewMode('recent')}
                            >
                                Most Recent
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={viewMode === 'category' ? 'default' : 'outline'}
                                onClick={() => setViewMode('category')}
                            >
                                By Category
                            </Button>
                        </div>
                        <Button onClick={() => setIsCreateOpen(true)}>
                            <Plus className="icon-sm mr-2" /> New Resume
                        </Button>
                    </div>
                </div>
            </div>

            <div className="dashboard-main">
                {resumes.length === 0 ? (
                    <div className="dashboard-empty-state">
                        <FileText className="empty-icon" />
                        <h3 className="empty-title">No resumes yet</h3>
                        <p className="empty-desc">
                            Create your first resume and assign a category to organize your dashboard.
                        </p>
                        <Button onClick={() => setIsCreateOpen(true)}>
                            Create Resume
                        </Button>
                    </div>
                ) : viewMode === 'recent' ? (
                    <div className="resume-grid">
                        {sortedResumes.map((resume) => renderResumeCard(resume))}
                    </div>
                ) : (
                    <div className="resume-category-list">
                        {categoryGroups.map((group) => (
                            <section key={group.category} className="resume-category-section">
                                <header className="resume-category-header">
                                    <h2 className="resume-category-title">{group.category}</h2>
                                    <span className="resume-category-count">
                                        {getResumeCountLabel(group.resumes.length)}
                                    </span>
                                </header>
                                <div className="resume-grid">
                                    {group.resumes.map((resume) => renderResumeCard(resume))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>

            {isCreateOpen && (
                <div className="dialog-overlay">
                    <div className="dialog-content">
                        <div className="dialog-header">
                            <h2 className="dialog-title">Create New Resume</h2>
                            <p className="dialog-description">Add a title and category to organize it on your dashboard.</p>
                        </div>
                        <form onSubmit={handleCreate}>
                            {createError && <div className="error-banner">{createError}</div>}
                            <div className="form-group py-4">
                                <div className="grid gap-2">
                                    <label htmlFor="title" className="form-label">Resume Title</label>
                                    <input
                                        id="title"
                                        className="input"
                                        placeholder="e.g. Software Engineer 2026"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="grid gap-2 dashboard-create-category">
                                    <label htmlFor="category" className="form-label">Category</label>
                                    <input
                                        id="category"
                                        className="input"
                                        placeholder="e.g. Product, Backend, Internship"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="dialog-footer">
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={!newTitle.trim() || createLoading}>
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
