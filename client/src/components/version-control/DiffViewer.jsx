import { diffLines, diffWords } from 'diff'
import { cn } from "@/lib/utils"

export default function DiffViewer({ oldText, newText, mode = 'words' }) {
    const diff = mode === 'lines'
        ? diffLines(oldText, newText)
        : diffWords(oldText, newText)

    return (
        <div className="diff-viewer">
            {diff.map((part, index) => {
                const color = part.added ? 'diff-added' :
                    part.removed ? 'diff-removed' :
                        'diff-unchanged'

                return (
                    <span key={index} className={cn("diff-chunk", color)}>
                        {part.value}
                    </span>
                )
            })}
        </div>
    )
}
