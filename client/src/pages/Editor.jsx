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
import { History, Save, ArrowLeft, Loader2, Check, Download, Plus, Trash2 } from "lucide-react"
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

const LIST_SECTION_CONFIG = {
    experience: {
        itemLabel: "Experience",
        helperText: "Add each role with company, timeline, and impact bullets.",
        titleLabel: "Role",
        titlePlaceholder: "Senior Software Engineer",
        subtitleLabel: "Company",
        subtitlePlaceholder: "Acme Inc.",
        dateLabel: "Duration",
        datePlaceholder: "Jan 2022 - Present",
        locationLabel: "Location",
        locationPlaceholder: "San Francisco, CA",
        showLocation: true,
        showLink: false,
        descriptionLabel: "Highlights",
        descriptionPlaceholder: "- Built a feature that improved conversion by 18%.\n- Reduced API response times by 40%.",
    },
    projects: {
        itemLabel: "Project",
        helperText: "Include strong project work with measurable outcomes.",
        titleLabel: "Project Name",
        titlePlaceholder: "Resume Version Control",
        subtitleLabel: "Tech Stack / Role",
        subtitlePlaceholder: "React, Node.js, PostgreSQL",
        dateLabel: "Timeline",
        datePlaceholder: "2025",
        locationLabel: "Location",
        locationPlaceholder: "",
        showLocation: false,
        showLink: true,
        descriptionLabel: "Highlights",
        descriptionPlaceholder: "- Shipped real-time collaboration.\n- Added semantic search across resume versions.",
    },
    achievements: {
        itemLabel: "Achievement",
        helperText: "Add awards, recognitions, scholarships, or measurable milestones.",
        titleLabel: "Achievement",
        titlePlaceholder: "Employee of the Year",
        subtitleLabel: "Organization",
        subtitlePlaceholder: "Tech Corp",
        dateLabel: "Date",
        datePlaceholder: "2024",
        locationLabel: "Location",
        locationPlaceholder: "",
        showLocation: false,
        showLink: false,
        descriptionLabel: "Details",
        descriptionPlaceholder: "- Recognized for leading a key migration project.",
    },
    education: {
        itemLabel: "Education",
        helperText: "Add degree, institution, and relevant highlights.",
        titleLabel: "Degree / Program",
        titlePlaceholder: "B.S. Computer Science",
        subtitleLabel: "Institution",
        subtitlePlaceholder: "University Name",
        dateLabel: "Duration",
        datePlaceholder: "2018 - 2022",
        locationLabel: "Location",
        locationPlaceholder: "Berkeley, CA",
        showLocation: true,
        showLink: false,
        descriptionLabel: "Highlights",
        descriptionPlaceholder: "- GPA: 3.8\n- Relevant coursework: Systems Design, Distributed Systems",
    },
    default: {
        itemLabel: "Item",
        helperText: "Add details for this section.",
        titleLabel: "Title",
        titlePlaceholder: "Title",
        subtitleLabel: "Subtitle",
        subtitlePlaceholder: "Subtitle",
        dateLabel: "Date",
        datePlaceholder: "Date",
        locationLabel: "Location",
        locationPlaceholder: "Location",
        showLocation: true,
        showLink: false,
        descriptionLabel: "Details",
        descriptionPlaceholder: "- Add key points",
    },
}

const createListItemId = (sectionId) => `${sectionId}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`

const normalizeTextValue = (value, fallback = "") => {
    return typeof value === "string" ? value : fallback
}

const htmlToPlainText = (value = "") => {
    return normalizeTextValue(value)
        .replace(/<\/li>/gi, "\n")
        .replace(/<li[^>]*>/gi, "- ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}

const normalizeDescription = (value) => {
    const raw = normalizeTextValue(value)
    if (!raw) return ""
    return /<[^>]+>/.test(raw) ? htmlToPlainText(raw) : raw
}

const getListSectionConfig = (sectionId) => {
    return LIST_SECTION_CONFIG[sectionId] || LIST_SECTION_CONFIG.default
}

const createEmptyListItem = (sectionId) => ({
    id: createListItemId(sectionId),
    title: "",
    subtitle: "",
    date: "",
    location: "",
    link: "",
    description: "",
})

const normalizeListItem = (sectionId, item = {}, index = 0) => ({
    id: normalizeTextValue(item.id) || `${sectionId}-${index + 1}`,
    title: normalizeTextValue(item.title) || normalizeTextValue(item.position) || normalizeTextValue(item.role) || normalizeTextValue(item.degree),
    subtitle: normalizeTextValue(item.subtitle) || normalizeTextValue(item.company) || normalizeTextValue(item.organization) || normalizeTextValue(item.school) || normalizeTextValue(item.institution),
    date: normalizeTextValue(item.date) || normalizeTextValue(item.duration) || normalizeTextValue(item.year),
    location: normalizeTextValue(item.location),
    link: normalizeTextValue(item.link) || normalizeTextValue(item.url),
    description: normalizeDescription(item.description) || normalizeDescription(item.details),
})

const normalizeSection = (section, defaultSection = null) => {
    const baseSection = {
        id: section?.id || defaultSection?.id || `section-${Date.now()}`,
        title: section?.title || defaultSection?.title || "Untitled Section",
        type: section?.type || defaultSection?.type || "text",
        content: section?.content ?? defaultSection?.content ?? "",
    }

    if (baseSection.type === "personal") {
        const defaultContent = defaultSection?.content && typeof defaultSection.content === "object" ? defaultSection.content : {}
        const incomingContent = section?.content && typeof section.content === "object" ? section.content : {}
        return {
            ...baseSection,
            content: {
                ...defaultContent,
                ...incomingContent,
            }
        }
    }

    if (baseSection.type === "list") {
        const rawItems =
            (Array.isArray(section?.content) && section.content) ||
            (Array.isArray(section?.items) && section.items) ||
            (Array.isArray(defaultSection?.content) && defaultSection.content) ||
            (Array.isArray(defaultSection?.items) && defaultSection.items) ||
            []

        return {
            ...baseSection,
            content: rawItems.map((item, index) => normalizeListItem(baseSection.id, item, index)),
        }
    }

    if (baseSection.type === "text") {
        return {
            ...baseSection,
            content: normalizeTextValue(baseSection.content),
        }
    }

    return baseSection
}

const normalizeResumeContent = (rawResume) => {
    const baseResume = rawResume && typeof rawResume === "object" ? rawResume : {}
    const defaultSections = Array.isArray(mockResume.sections) ? mockResume.sections : []
    const incomingSections = Array.isArray(baseResume.sections)
        ? baseResume.sections.filter((section) => section?.id !== "summary")
        : []

    const normalizedDefaultSections = defaultSections.map((defaultSection) => {
        const incomingSection = incomingSections.find((section) => section?.id === defaultSection.id)
        return normalizeSection(incomingSection || defaultSection, defaultSection)
    })

    const extraSections = incomingSections
        .filter((section) => section?.id && !defaultSections.some((defaultSection) => defaultSection.id === section.id))
        .map((section) => normalizeSection(section))

    return {
        ...mockResume,
        ...baseResume,
        sections: [...normalizedDefaultSections, ...extraSections],
    }
}

const getDescriptionLines = (description) => {
    return normalizeTextValue(description)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/^[-*•]\s*/, ""))
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
    const printPreviewRef = useRef(null)

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
        contentRef: printPreviewRef,
        documentTitle: resumeData?.sections?.find(s => s.type === 'personal')?.content?.name || "Resume",
        pageStyle: `
            @page {
                size: A4;
                margin: 0;
            }
            @media print {
                body {
                    margin: 0;
                    padding: 0;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .preview-paper {
                    box-shadow: none !important;
                    border-radius: 0 !important;
                    margin: 0 auto !important;
                }
            }
        `,
    })

    // Fetch Resume
    useEffect(() => {
        if (isGuest) {
            const guestContent = normalizeResumeContent(mockResume)
            setResumeData(guestContent)
            if (guestContent.sections && guestContent.sections.length > 0) {
                setActiveSectionId(guestContent.sections[0].id)
            }
            setLoading(false)
            return
        }

        if (!id) {
            const resolveEditorRoute = async () => {
                try {
                    const resumes = await resumeService.getAllResumes();
                    if (resumes.length > 0) {
                        navigate(`/editor/${resumes[0].id}`, { replace: true });
                    } else {
                        navigate('/dashboard', { replace: true });
                    }
                } catch (error) {
                    console.error("Failed to resolve editor route", error);
                    navigate('/dashboard', { replace: true });
                } finally {
                    setLoading(false);
                }
            };

            resolveEditorRoute();
            return;
        }

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

                const normalizedContent = normalizeResumeContent(content)
                setResumeData(normalizedContent);
                if (normalizedContent.sections && normalizedContent.sections.length > 0) {
                    setActiveSectionId(normalizedContent.sections[0].id);
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
                setHistory(versions.map(v => {
                    const parsedData = typeof v.content === 'string' ? JSON.parse(v.content) : v.content
                    return {
                        id: v.id,
                        timestamp: new Date(v.createdAt).toLocaleString(),
                        message: v.commitMsg || `Version ${v.version}`,
                        hash: v.id.substring(0, 8),
                        data: normalizeResumeContent(parsedData),
                        version: v.version,
                    }
                }));
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

    useEffect(() => {
        if (!resumeData?.sections?.length) return
        if (!resumeData.sections.some((section) => section.id === activeSectionId)) {
            setActiveSectionId(resumeData.sections[0].id)
        }
    }, [resumeData, activeSectionId])

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

    const updateActiveListItems = (updater) => {
        setResumeData((prev) => ({
            ...prev,
            sections: prev.sections.map((section) => {
                if (section.id !== activeSectionId) return section
                const currentItems = Array.isArray(section.content) ? section.content : []
                return {
                    ...section,
                    content: updater(currentItems),
                }
            })
        }))
    }

    const handleListItemChange = (itemId, field, value) => {
        updateActiveListItems((items) => items.map((item) => {
            if (item.id !== itemId) return item
            return {
                ...item,
                [field]: value,
            }
        }))
    }

    const handleAddListItem = () => {
        if (!activeSection || activeSection.type !== "list") return
        updateActiveListItems((items) => [...items, createEmptyListItem(activeSection.id)])
    }

    const handleRemoveListItem = (itemId) => {
        updateActiveListItems((items) => items.filter((item) => item.id !== itemId))
    }

    const handleMoveSection = (sectionId, direction) => {
        setResumeData((prev) => {
            if (!prev?.sections?.length) return prev

            const currentIndex = prev.sections.findIndex((section) => section.id === sectionId)
            if (currentIndex === -1) return prev

            const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
            if (targetIndex < 0 || targetIndex >= prev.sections.length) return prev

            const nextSections = [...prev.sections]
            const [movedSection] = nextSections.splice(currentIndex, 1)
            nextSections.splice(targetIndex, 0, movedSection)

            return {
                ...prev,
                sections: nextSections,
            }
        })
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
            setAuthPromptDesc("Sign up to get instant AI suggestions for your experience, education, and skills.");
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
            const restoredData = normalizeResumeContent(commit.data)
            setResumeData(restoredData);
            setIsHistoryOpen(false);
        }
    }

    const handleCompare = (commit) => {
        setDiffCommit(commit)
        setIsDiffOpen(true)
    }

    const renderPreviewSectionContent = (section) => {
        if (section.type === "text") {
            return (
                <div
                    className="preview-section-content"
                    dangerouslySetInnerHTML={{ __html: normalizeTextValue(section.content) }}
                />
            )
        }

        if (section.type === "list") {
            const listItems = Array.isArray(section.content) ? section.content : []

            if (listItems.length === 0) {
                return <p className="preview-empty">No details added yet.</p>
            }

            return (
                <div className="preview-list">
                    {listItems.map((item) => {
                        const descriptionLines = getDescriptionLines(item.description)
                        const leftMeta = [item.subtitle, item.location].filter(Boolean).join(" • ")

                        return (
                            <div key={item.id} className="preview-list-item">
                                <div className="preview-list-row">
                                    <h4 className="preview-item-title">{item.title || "Untitled"}</h4>
                                    {item.date && <span className="preview-item-date">{item.date}</span>}
                                </div>
                                {(leftMeta || item.link) && (
                                    <div className="preview-list-row preview-list-subrow">
                                        <span className="preview-item-meta">{leftMeta}</span>
                                        {item.link && <span className="preview-item-link">{item.link}</span>}
                                    </div>
                                )}
                                {descriptionLines.length > 0 && (
                                    <ul className="preview-item-bullets">
                                        {descriptionLines.map((line, index) => (
                                            <li key={`${item.id}-line-${index}`}>{line}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )
                    })}
                </div>
            )
        }

        return <p className="preview-section-content">{normalizeTextValue(section.content)}</p>
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

    const personalSection = resumeData.sections.find((section) => section.type === "personal")
    const listConfig = activeSection?.type === "list" ? getListSectionConfig(activeSection.id) : null
    const listItems = activeSection?.type === "list" && Array.isArray(activeSection.content)
        ? activeSection.content
        : []

    const renderResumePaper = (className = "", ref = null) => (
        <div className={`preview-paper ${className}`.trim()} ref={ref}>
            {personalSection && (
                <div className="preview-personal">
                    <h1 className="preview-name">
                        {personalSection?.content.name || "Your Name"}
                    </h1>
                    <div className="preview-contact-row">
                        {personalSection?.content.email && (
                            <span>{personalSection.content.email}</span>
                        )}
                        {personalSection?.content.phone && (
                            <span>{personalSection.content.phone}</span>
                        )}
                        {personalSection?.content.location && (
                            <span>{personalSection.content.location}</span>
                        )}
                    </div>
                    <div className="preview-contact-row">
                        {personalSection?.content.linkedin && (
                            <span>{personalSection.content.linkedin}</span>
                        )}
                        {personalSection?.content.github && (
                            <span>{personalSection.content.github}</span>
                        )}
                        {personalSection?.content.website && (
                            <span>{personalSection.content.website}</span>
                        )}
                    </div>
                </div>
            )}
            {resumeData.sections.filter((section) => section.type !== 'personal').map((section) => (
                <div key={section.id} className="preview-section">
                    <h3 className="preview-section-heading">{section.title}</h3>
                    {renderPreviewSectionContent(section)}
                </div>
            ))}
        </div>
    )

    return (
        <div className="editor-layout">
            {/* Sidebar */}
            <EditorSidebar
                sections={resumeData.sections}
                activeSection={activeSectionId}
                onSelectSection={setActiveSectionId}
                onMoveSection={handleMoveSection}
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
                                            <label className="editor-label">GitHub</label>
                                            <input
                                                className="input"
                                                placeholder="github.com/johndoe"
                                                value={activeSection.content.github || ''}
                                                onChange={(e) => handleContentChange({ ...activeSection.content, github: e.target.value })}
                                            />
                                        </div>
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
                        )}
                        {activeSection?.type === 'list' && listConfig && (
                            <div className="editor-stack-sm">
                                <div className="list-section-toolbar">
                                    <p className="list-section-hint">{listConfig.helperText}</p>
                                    <Button type="button" variant="outline" size="sm" onClick={handleAddListItem}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add {listConfig.itemLabel}
                                    </Button>
                                </div>

                                {listItems.length === 0 ? (
                                    <div className="editor-card">
                                        <p className="list-empty-state">No {listConfig.itemLabel.toLowerCase()} entries yet.</p>
                                    </div>
                                ) : (
                                    <SortableList
                                        items={listItems}
                                        onReorder={handleListReorder}
                                        renderItem={(item) => (
                                            <SortableItem key={item.id} id={item.id} className="sortable-card">
                                                <div className="list-item-actions">
                                                    <span className="sortable-meta">Drag to reorder</span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive"
                                                        onClick={() => handleRemoveListItem(item.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-1" />
                                                        Remove
                                                    </Button>
                                                </div>

                                                <div className="editor-grid-2">
                                                    <div className="editor-form-group">
                                                        <label className="editor-label">{listConfig.titleLabel}</label>
                                                        <input
                                                            className="input"
                                                            placeholder={listConfig.titlePlaceholder}
                                                            value={item.title || ''}
                                                            onChange={(e) => handleListItemChange(item.id, 'title', e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="editor-form-group">
                                                        <label className="editor-label">{listConfig.subtitleLabel}</label>
                                                        <input
                                                            className="input"
                                                            placeholder={listConfig.subtitlePlaceholder}
                                                            value={item.subtitle || ''}
                                                            onChange={(e) => handleListItemChange(item.id, 'subtitle', e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <div className={listConfig.showLocation ? "editor-grid-2" : "editor-grid-1"}>
                                                    <div className="editor-form-group">
                                                        <label className="editor-label">{listConfig.dateLabel}</label>
                                                        <input
                                                            className="input"
                                                            placeholder={listConfig.datePlaceholder}
                                                            value={item.date || ''}
                                                            onChange={(e) => handleListItemChange(item.id, 'date', e.target.value)}
                                                        />
                                                    </div>
                                                    {listConfig.showLocation && (
                                                        <div className="editor-form-group">
                                                            <label className="editor-label">{listConfig.locationLabel}</label>
                                                            <input
                                                                className="input"
                                                                placeholder={listConfig.locationPlaceholder}
                                                                value={item.location || ''}
                                                                onChange={(e) => handleListItemChange(item.id, 'location', e.target.value)}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {listConfig.showLink && (
                                                    <div className="editor-form-group">
                                                        <label className="editor-label">Link</label>
                                                        <input
                                                            className="input"
                                                            placeholder="github.com/your-project"
                                                            value={item.link || ''}
                                                            onChange={(e) => handleListItemChange(item.id, 'link', e.target.value)}
                                                        />
                                                    </div>
                                                )}

                                                <div className="editor-form-group">
                                                    <label className="editor-label">{listConfig.descriptionLabel}</label>
                                                    <textarea
                                                        className="commit-textarea list-item-textarea"
                                                        placeholder={listConfig.descriptionPlaceholder}
                                                        value={item.description || ''}
                                                        onChange={(e) => handleListItemChange(item.id, 'description', e.target.value)}
                                                    />
                                                    <p className="list-item-help">Use one bullet point per line.</p>
                                                </div>
                                            </SortableItem>
                                        )}
                                    />
                                )}
                            </div>
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
                <div className="editor-preview-header">
                    <h2 className="editor-preview-title">Live Preview</h2>
                </div>
                <div className="editor-preview-canvas">
                    <div className="preview-paper-frame">
                        {renderResumePaper("preview-paper-screen")}
                    </div>
                </div>
            </aside>
            <div className="print-preview-root" aria-hidden="true">
                {renderResumePaper("preview-paper-print", printPreviewRef)}
            </div>
        </div>
    )
}
