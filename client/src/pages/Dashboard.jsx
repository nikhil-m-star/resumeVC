import { useState, useEffect } from 'react';
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

export default function Dashboard() {
    const [resumes, setResumes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [createLoading, setCreateLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchResumes();
    }, []);

    const fetchResumes = async () => {
        try {
            const data = await resumeService.getAllResumes();
            setResumes(data);
        } catch (error) {
            console.error('Failed to fetch resumes', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            const newResume = await resumeService.createResume({
                title: newTitle,
                description: 'Created via ResumeForge',
                isPublic: false
            });
            setIsCreateOpen(false);
            setNewTitle('');
            // Navigate to editor immediately
            navigate(`/editor/${newResume.id}`);
        } catch (error) {
            console.error('Failed to create resume', error);
        } finally {
            setCreateLoading(false);
        }
    };

    const handleDelete = async (resumeId) => {
        if (!window.confirm('Delete this resume? This action cannot be undone.')) return;
        setDeletingId(resumeId);
        try {
            await resumeService.deleteResume(resumeId);
            setResumes((prev) => prev.filter((resume) => resume.id !== resumeId));
        } catch (error) {
            console.error('Failed to delete resume', error);
            alert('Failed to delete resume');
        } finally {
            setDeletingId(null);
        }
    };

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
                        <p className="dashboard-subtitle">Manage your resumes and versions</p>
                    </div>
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="icon-sm mr-2" /> New Resume
                    </Button>
                </div>
            </div>

            <div className="dashboard-main">
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
                                            onClick={() => handleDelete(resume.id)}
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

                    {/* Empty State if no resumes */}
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

            {/* Create Resume Dialog */}
            {isCreateOpen && (
                <div className="dialog-overlay">
                    <div className="dialog-content">
                        <div className="dialog-header">
                            <h2 className="dialog-title">Create New Resume</h2>
                            <p className="dialog-description">Give your resume a name to get started.</p>
                        </div>
                        <form onSubmit={handleCreate}>
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
        </div>
    );
}
