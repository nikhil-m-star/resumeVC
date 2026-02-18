import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from "@/lib/utils"

export function SortableItem({ id, children, className }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 0,
        opacity: isDragging ? 0.5 : 1
    }

    return (
        <div ref={setNodeRef} style={style} className={cn("sortable-item", className)}>
            <div
                {...attributes}
                {...listeners}
                className="sortable-handle"
            >
                <GripVertical className="h-4 w-4" />
            </div>
            <div className="sortable-content">
                {children}
            </div>
        </div>
    )
}
