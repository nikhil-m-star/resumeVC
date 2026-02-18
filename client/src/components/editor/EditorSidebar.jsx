import { FileText, GripVertical, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

export default function EditorSidebar({ sections, activeSection, onSelectSection }) {
    return (
        <aside className="editor-sidebar">
            <div className="sidebar-header">
                <h2 className="sidebar-title">
                    <FileText className="icon-sm" />
                    Structure
                </h2>
            </div>
            <div className="sidebar-content">
                {sections.map((section) => (
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
