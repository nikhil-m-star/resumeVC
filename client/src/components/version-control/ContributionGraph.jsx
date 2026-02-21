import { GitCommitHorizontal, CalendarDays, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_WEEKS_TO_SHOW } from '@/lib/contribution-utils';

const EMPTY_GRAPH_DATA = {
    cells: [],
    totalCommits: 0,
    activeDays: 0,
    streak: 0,
};

export default function ContributionGraph({
    data = EMPTY_GRAPH_DATA,
    isLoading = false,
    title = 'Resume Contribution Graph',
    subtitle = 'Activity from your version commits',
    rangeLabel,
    loadingLabel = 'Building contribution graph...',
    className,
}) {
    const safeData = {
        ...EMPTY_GRAPH_DATA,
        ...(data || {}),
    };

    const range = rangeLabel || `Last ${DEFAULT_WEEKS_TO_SHOW} weeks`;

    return (
        <section className={cn('contrib-panel', className)}>
            <div className="contrib-panel-header">
                <div>
                    <h2 className="contrib-title">{title}</h2>
                    <p className="contrib-subtitle">{subtitle}</p>
                </div>
                <span className="contrib-range">{range}</span>
            </div>

            <div className="contrib-stats">
                <div className="contrib-stat-card">
                    <GitCommitHorizontal className="icon-sm" />
                    <div>
                        <p className="contrib-stat-label">Total commits</p>
                        <p className="contrib-stat-value">{safeData.totalCommits}</p>
                    </div>
                </div>
                <div className="contrib-stat-card">
                    <CalendarDays className="icon-sm" />
                    <div>
                        <p className="contrib-stat-label">Active days</p>
                        <p className="contrib-stat-value">{safeData.activeDays}</p>
                    </div>
                </div>
                <div className="contrib-stat-card">
                    <Flame className="icon-sm" />
                    <div>
                        <p className="contrib-stat-label">Current streak</p>
                        <p className="contrib-stat-value">{safeData.streak} day{safeData.streak === 1 ? '' : 's'}</p>
                    </div>
                </div>
            </div>

            <div className="contrib-grid-shell">
                {isLoading ? (
                    <div className="contrib-loading">{loadingLabel}</div>
                ) : (
                    <>
                        <div className="contrib-grid">
                            {safeData.cells.map((cell, index) => {
                                const tooltipDate = cell.dateKey
                                    ? new Date(`${cell.dateKey}T00:00:00`).toLocaleDateString()
                                    : '';
                                const tooltip = cell.inRange
                                    ? `${cell.count} commit${cell.count === 1 ? '' : 's'} on ${tooltipDate}`
                                    : '';

                                return (
                                    <span
                                        key={`${cell.dateKey || 'empty'}-${index}`}
                                        className={`contrib-cell level-${cell.level} ${cell.inRange ? '' : 'outside'}`}
                                        title={tooltip}
                                    />
                                );
                            })}
                        </div>
                        <div className="contrib-legend">
                            <span>Less</span>
                            <span className="contrib-cell level-0" />
                            <span className="contrib-cell level-1" />
                            <span className="contrib-cell level-2" />
                            <span className="contrib-cell level-3" />
                            <span className="contrib-cell level-4" />
                            <span>More</span>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
