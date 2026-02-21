import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'

export default function SortableList({ items = [], onReorder, renderItem }) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    function handleDragEnd(event) {
        const { active, over } = event

        if (!over || active.id === over.id) return

        if (active.id !== over.id) {
            const oldIndex = items.findIndex((item) => item.id === active.id)
            const newIndex = items.findIndex((item) => item.id === over.id)

            if (oldIndex < 0 || newIndex < 0) return
            onReorder(arrayMove(items, oldIndex, newIndex))
        }
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={items.map(item => item.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="sortable-list">
                    {items.map((item) => renderItem(item))}
                </div>
            </SortableContext>
        </DndContext>
    )
}
