import { FileText, GripVertical, Settings, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export default function EditorSidebar({ sections, activeSection, onSelectSection, onMoveSection }) {
    return (
        <aside className="editor-sidebar">
            <div className="sidebar-header">
                <h2 className="sidebar-title">
                    <FileText className="icon-sm" />
                    Structure
                </h2>
            </div>
            <div className="sidebar-content">
                {sections.map((section, index) => (
                    <div
                        key={section.id}
                        onClick={() => onSelectSection(section.id)}
                        className={cn(
                            "sidebar-item",
                            activeSection === section.id ? "active" : "inactive"
                        )}
                    >
                        <GripVertical className="drag-handle" />
                        <span className="truncate">{section.title}</span>
                        <div className="sidebar-order-actions">
                            <button
                                type="button"
                                className="sidebar-order-btn"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onMoveSection(section.id, "up")
                                }}
                                disabled={index === 0}
                                aria-label={`Move ${section.title} up`}
                                title="Move up"
                            >
                                <ChevronUp className="icon-xs" />
                            </button>
                            <button
                                type="button"
                                className="sidebar-order-btn"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onMoveSection(section.id, "down")
                                }}
                                disabled={index === sections.length - 1}
                                aria-label={`Move ${section.title} down`}
                                title="Move down"
                            >
                                <ChevronDown className="icon-xs" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="sidebar-footer">
                <button className="sidebar-settings-btn">
                    <Settings className="icon-sm" />
                    Settings
                </button>
            </div>
        </aside>
    )
}
