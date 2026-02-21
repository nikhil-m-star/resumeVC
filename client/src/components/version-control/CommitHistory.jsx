import { GitCommit, Clock } from "lucide-react"

export default function CommitHistory({ commits, onRestore, onCompare }) {
    return (
        <div className="commit-history">
            <h3 className="history-title">
                <Clock className="h-4 w-4" />
                Version History
            </h3>
            <div className="history-timeline">
                {commits.map((commit) => (
                    <div key={commit.id} className="commit-item">
                        <div className="commit-dot" />
                        <div className="commit-card">
                            <div className="commit-header">
                                <span className="commit-message">{commit.message}</span>
                                <span className="commit-time">{commit.timestamp}</span>
                            </div>
                            <div className="commit-hash">
                                {commit.hash}
                            </div>
                            <div className="commit-actions">
                                <button
                                    onClick={() => onRestore(commit)}
                                    className="action-btn restore"
                                >
                                    <GitCommit className="h-3 w-3" />
                                    Restore
                                </button>
                                <button
                                    onClick={() => onCompare && onCompare(commit)}
                                    className="action-btn compare"
                                >
                                    Compare
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
