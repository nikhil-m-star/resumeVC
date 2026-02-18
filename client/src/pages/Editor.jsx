import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import EditorSidebar from "@/components/editor/EditorSidebar"
import RichTextEditor from "@/components/editor/RichTextEditor"
import AIAssistant from "@/components/editor/AIAssistant"
import { mockResume } from "@/data/mock-resume"
import SortableList from "@/components/editor/SortableList"
import { SortableItem } from "@/components/editor/SortableItem"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import CommitHistory from "@/components/version-control/CommitHistory"
import DiffViewer from "@/components/version-control/DiffViewer"
import { AuthPromptDialog } from "@/components/auth/AuthPromptDialog"
import { History, Save, ArrowLeft, Loader2, Check, Download } from "lucide-react"
import { resumeService } from "@/services/resume.service"
import { Button } from "@/components/ui/button"
import { useReactToPrint } from "react-to-print"

// Simple debounce hook
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

export default function Editor() {
    const { id } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const isGuest = location.pathname === '/editor/demo'

    // State
    const [resumeData, setResumeData] = useState(null)
    const [activeSectionId, setActiveSectionId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [lastSaved, setLastSaved] = useState(null)

    // Refs
    const previewRef = useRef(null)

    // Version Control State
    const [history, setHistory] = useState([])
    const [isCommitDialogOpen, setIsCommitDialogOpen] = useState(false)
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)
    const [commitMessage, setCommitMessage] = useState("")
    const [isDiffOpen, setIsDiffOpen] = useState(false)
    const [diffCommit, setDiffCommit] = useState(null)

    // Auth Prompt State
    const [showAuthPrompt, setShowAuthPrompt] = useState(false)
    const [authPromptTitle, setAuthPromptTitle] = useState("")
    const [authPromptDesc, setAuthPromptDesc] = useState("")

    // Print logic
    const handlePrint = useReactToPrint({
        contentRef: previewRef,
        documentTitle: resumeData?.sections?.find(s => s.type === 'personal')?.content?.name || "Resume",
    })

    // Fetch Resume
    useEffect(() => {
        if (isGuest) {
            // Load Mock Data for Guest
            setResumeData(mockResume);
            if (mockResume.sections && mockResume.sections.length > 0) {
                setActiveSectionId(mockResume.sections[0].id);
            }
            setLoading(false);
            return;
        }

        if (!id) return;

        const loadResume = async () => {
            try {
                const resume = await resumeService.getResume(id);
                let content;

                if (resume.content) {
                    try {
                        content = typeof resume.content === 'string' ? JSON.parse(resume.content) : resume.content;
                    } catch (e) {
                        console.error("Failed to parse resume content", e);
                        content = mockResume; // Fallback
                    }
                } else {
                    content = mockResume;
                }

                setResumeData(content);
                if (content.sections && content.sections.length > 0) {
                    setActiveSectionId(content.sections[0].id);
                }
                setLoading(false);
            } catch (error) {
                console.error("Failed to load resume", error);
                navigate('/dashboard');
            }
        };

        loadResume();

        // Load history/versions
        const loadHistory = async () => {
            try {
                const versions = await resumeService.getVersions(id);
                setHistory(versions.map(v => ({
                    id: v.id,
                    timestamp: new Date(v.createdAt).toLocaleString(),
                    message: v.commitMsg || `Version ${v.version}`,
                    hash: v.id.substring(0, 8),
                    data: typeof v.content === 'string' ? JSON.parse(v.content) : v.content,
                    version: v.version
                })));
            } catch (error) {
                console.error("Failed to load history", error);
            }
        };
        loadHistory();

    }, [id, navigate, isGuest]);

    // Auto-Save Logic
    const debouncedData = useDebounce(resumeData, 2000);

    useEffect(() => {
        if (!debouncedData || loading || isGuest) return;

        const saveDraft = async () => {
            setSaving(true);
            try {
                await resumeService.updateResume(id, {
                    content: JSON.stringify(debouncedData)
                });
                setLastSaved(new Date());
            } catch (error) {
                console.error("Failed to auto-save", error);
            } finally {
                setSaving(false);
            }
        };

        saveDraft();
    }, [debouncedData, id, loading, isGuest]);


    const activeSection = resumeData?.sections?.find(s => s.id === activeSectionId)

    const handleContentChange = (newContent) => {
        setResumeData(prev => ({
            ...prev,
            sections: prev.sections.map(s =>
                s.id === activeSectionId
                    ? { ...s, content: newContent }
                    : s
            )
        }))
    }

    const handleListReorder = (newItems) => {
        setResumeData(prev => ({
            ...prev,
            sections: prev.sections.map(s =>
                s.id === activeSectionId
                    ? { ...s, content: newItems }
                    : s
            )
        }))
    }

    const handleCommitRequest = () => {
        if (isGuest) {
            setAuthPromptTitle("Save Your Progress");
            setAuthPromptDesc("Create a free account to save versions, access commit history, and sync your resume across devices.");
            setShowAuthPrompt(true);
            return;
        }
        setIsCommitDialogOpen(true);
    }

    const handleAIRequest = () => {
        if (isGuest) {
            setAuthPromptTitle("Unlock AI Assistant");
            setAuthPromptDesc("Sign up to get instant AI suggestions for your summary, experience, and skills.");
            setShowAuthPrompt(true);
            return;
        }
        // Proceed with AI logic (handled in component)
    }

    const handleCommit = async () => {
        try {
            const version = await resumeService.createVersion(
                id,
                JSON.stringify(resumeData),
                commitMessage || "Update resume"
            );

            const newCommit = {
                id: version.id,
                timestamp: new Date(version.createdAt).toLocaleString(),
                message: version.commitMsg,
                hash: version.id.substring(0, 8),
                data: resumeData,
                version: version.version
            };

            setHistory([newCommit, ...history]);
            setCommitMessage("");
            setIsCommitDialogOpen(false);
            alert("Version saved!");
        } catch (error) {
            console.error("Failed to commit version", error);
            alert("Failed to save version");
        }
    }

    const handleRestore = (commit) => {
        if (confirm("Are you sure? This will overwrite your current draft.")) {
            setResumeData(commit.data);
            setIsHistoryOpen(false);
        }
    }

    const handleCompare = (commit) => {
        setDiffCommit(commit)
        setIsDiffOpen(true)
    }

    if (loading) {
        return (
            <div className="flex-center h-screen">
                <Loader2 className="icon-lg animate-spin" />
            </div>
        );
    }

    if (!resumeData) {
        return (
            <div className="flex-center h-screen flex-col gap-4">
                <h2 className="editor-title">Resume not found</h2>
                <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
            </div>
        );
    }

    return (
        <div className="editor-layout">
            {/* Sidebar */}
            <EditorSidebar
                sections={resumeData.sections}
                activeSection={activeSectionId}
                onSelectSection={setActiveSectionId}
            />

            {/* Main Editor Area */}
            <main className="editor-main">
                <header className="editor-header">
                    <div className="items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate(isGuest ? '/' : '/dashboard')}>
                            <ArrowLeft className="icon-sm" />
                        </Button>
                        <div>
                            <h1 className="editor-title">{activeSection?.title || "Editor"}</h1>
                            <div className="editor-status">
                                {isGuest ? (
                                    <span className="text-amber-500 font-medium">Guest Mode (Unsaved)</span>
                                ) : saving ? (
                                    <>
                                        <Loader2 className="icon-xs animate-spin mr-1" /> Saving...
                                    </>
                                ) : lastSaved ? (
                                    <>
                                        <Check className="icon-xs mr-1" /> Saved {lastSaved.toLocaleTimeString()}
                                    </>
                                ) : (
                                    <span>Unsaved</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handlePrint}
                            title="Download PDF"
                        >
                            <Download className="h-5 w-5" />
                        </Button>
                        {!isGuest && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsHistoryOpen(true)}
                                title="View History"
                            >
                                <History className="h-5 w-5" />
                            </Button>
                        )}
                        <Button
                            onClick={handleCommitRequest}
                            className="gap-2"
                        >
                            <Save className="h-4 w-4" />
                            {isGuest ? "Save" : "Save Version"}
                        </Button>
                    </div>
                </header>

                <div className="editor-content">
                    <div className="editor-wrapper">
                        {isGuest && (
                            <div className="guest-banner">
                                You are in Guest Mode. Changes will be lost if you refresh. <button onClick={handleCommitRequest} className="guest-banner-link">Sign up to save.</button>
                            </div>
                        )}

                        {activeSection?.type === 'text' && (
                            <div className="editor-stack-sm">
                                <div onClickCapture={isGuest ? (e) => { e.stopPropagation(); handleAIRequest(); } : undefined}>
                                    <AIAssistant
                                        content={activeSection.content}
                                        type={activeSection.title} // e.g. "Summary" or "Experience"
                                        onApply={handleContentChange}
                                    />
                                </div>
                                <RichTextEditor
                                    content={activeSection.content}
                                    onChange={handleContentChange}
                                    className="min-h-300"
                                />
                            </div>
                        )}
                        {activeSection?.type === 'personal' && (
                            <div className="editor-card">
                                <div className="editor-stack-sm">
                                    <div className="editor-form-group">
                                        <label className="editor-label">Full Name</label>
                                        <input
                                            className="input"
                                            placeholder="John Doe"
                                            value={activeSection.content.name || ''}
                                            onChange={(e) => handleContentChange({ ...activeSection.content, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="editor-grid-2">
                                        <div className="editor-form-group">
                                            <label className="editor-label">Email</label>
                                            <input
                                                className="input"
                                                type="email"
                                                placeholder="john@example.com"
                                                value={activeSection.content.email || ''}
                                                onChange={(e) => handleContentChange({ ...activeSection.content, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="editor-form-group">
                                            <label className="editor-label">Phone</label>
                                            <input
                                                className="input"
                                                placeholder="+1 234 567 890"
                                                value={activeSection.content.phone || ''}
                                                onChange={(e) => handleContentChange({ ...activeSection.content, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="editor-form-group">
                                        <label className="editor-label">Location</label>
                                        <input
                                            className="input"
                                            placeholder="San Francisco, CA"
                                            value={activeSection.content.location || ''}
                                            onChange={(e) => handleContentChange({ ...activeSection.content, location: e.target.value })}
                                        />
                                    </div>
                                    <div className="editor-grid-2">
                                        <div className="editor-form-group">
                                            <label className="editor-label">LinkedIn</label>
                                            <input
                                                className="input"
                                                placeholder="linkedin.com/in/johndoe"
                                                value={activeSection.content.linkedin || ''}
                                                onChange={(e) => handleContentChange({ ...activeSection.content, linkedin: e.target.value })}
                                            />
                                        </div>
                                        <div className="editor-form-group">
                                            <label className="editor-label">Website / Portfolio</label>
                                            <input
                                                className="input"
                                                placeholder="johndoe.com"
                                                value={activeSection.content.website || ''}
                                                onChange={(e) => handleContentChange({ ...activeSection.content, website: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeSection?.type === 'list' && (
                            <SortableList
                                items={activeSection.content}
                                onReorder={handleListReorder}
                                renderItem={(item) => (
                                    <SortableItem key={item.id} id={item.id} className="sortable-card">
                                        <h4 className="sortable-title">{item.title}</h4>
                                        <p className="sortable-meta">{item.company} | {item.date}</p>
                                        <div className="sortable-desc" dangerouslySetInnerHTML={{ __html: item.description }} />
                                    </SortableItem>
                                )}
                            />
                        )}
                    </div>
                </div>

                <Dialog open={isCommitDialogOpen} onOpenChange={setIsCommitDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Commit Changes</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Commit Message</label>
                                <textarea
                                    className="commit-textarea"
                                    placeholder="What did you change?"
                                    value={commitMessage}
                                    onChange={(e) => setCommitMessage(e.target.value)}
                                />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCommitDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleCommit}>Commit</Button>
                            </DialogFooter>
                        </div>
                    </DialogContent>
                </Dialog>

                <AuthPromptDialog
                    open={showAuthPrompt}
                    onOpenChange={setShowAuthPrompt}
                    title={authPromptTitle}
                    description={authPromptDesc}
                />

                {isHistoryOpen && (
                    <div className="history-panel">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-semibold text-lg">History</h2>
                            <Button variant="ghost" size="sm" onClick={() => setIsHistoryOpen(false)}>Close</Button>
                        </div>
                        <CommitHistory
                            commits={history}
                            onRestore={handleRestore}
                            onCompare={handleCompare}
                        />
                    </div>
                )}
            </main>

            <Dialog open={isDiffOpen} onOpenChange={setIsDiffOpen}>
                <DialogContent className="diff-dialog-content">
                    <DialogHeader>
                        <DialogTitle>Version Comparison</DialogTitle>
                    </DialogHeader>
                    {diffCommit && (
                        <div className="space-y-4">
                            <div className="diff-header">
                                <span>Current Version</span>
                                <span>vs</span>
                                <span>{diffCommit.message} ({diffCommit.hash})</span>
                            </div>
                            <div className="diff-grid">
                                <h4 className="diff-section-title">Differences</h4>
                                <DiffViewer
                                    oldText={JSON.stringify(diffCommit.data.sections, null, 2)}
                                    newText={JSON.stringify(resumeData.sections, null, 2)}
                                    mode="lines"
                                />
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <aside className="editor-preview">
                <div className="p-4 border-b">
                    <h2 className="font-semibold">Live Preview</h2>
                </div>
                <div className="flex-1 p-6 overflow-y-auto bg-gray-100">
                    <div className="preview-paper" ref={previewRef}>
                        {resumeData.sections.find(s => s.type === 'personal') && (
                            <div className="mb-8 border-b-2 border-black pb-4 text-center">
                                <h1 className="text-3xl font-bold uppercase tracking-tight mb-2">
                                    {resumeData.sections.find(s => s.type === 'personal')?.content.name || "Your Name"}
                                </h1>
                                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-gray-700">
                                    {resumeData.sections.find(s => s.type === 'personal')?.content.email && (
                                        <span>{resumeData.sections.find(s => s.type === 'personal').content.email}</span>
                                    )}
                                    {resumeData.sections.find(s => s.type === 'personal')?.content.phone && (
                                        <span>{resumeData.sections.find(s => s.type === 'personal').content.phone}</span>
                                    )}
                                    {resumeData.sections.find(s => s.type === 'personal')?.content.location && (
                                        <span>{resumeData.sections.find(s => s.type === 'personal').content.location}</span>
                                    )}
                                </div>
                                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-gray-700 mt-1">
                                    {resumeData.sections.find(s => s.type === 'personal')?.content.linkedin && (
                                        <span>{resumeData.sections.find(s => s.type === 'personal').content.linkedin}</span>
                                    )}
                                    {resumeData.sections.find(s => s.type === 'personal')?.content.website && (
                                        <span>{resumeData.sections.find(s => s.type === 'personal').content.website}</span>
                                    )}
                                </div>
                            </div>
                        )}
                        {resumeData.sections.filter(s => s.type !== 'personal').map(s => (
                            <div key={s.id} className="mb-6">
                                <h3 className="font-bold uppercase mb-2 border-b border-gray-300 pb-1 text-sm tracking-wider">{s.title}</h3>
                                <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{
                                    __html: typeof s.content === 'string' ? s.content : JSON.stringify(s.content)
                                }} />
                            </div>
                        ))}
                    </div>
                </div>
            </aside>
        </div>
    )
}
