import { GitCommitHorizontal, CalendarDays, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_WEEKS_TO_SHOW } from '@/lib/contribution-utils';

const DAYS_IN_WEEK = 7;

const EMPTY_GRAPH_DATA = {
    cells: [],
    totalCommits: 0,
    activeDays: 0,
    streak: 0,
};

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' });

const getMonthLabels = (cells = []) => {
    const safeCells = Array.isArray(cells) ? cells : [];
    if (safeCells.length === 0) return [];

    const labels = [];
    const seenMonths = new Set();
    const seenWeeks = new Set();

    const firstInRangeIndex = safeCells.findIndex((cell) => cell?.inRange && cell?.dateKey);
    if (firstInRangeIndex === -1) return [];

    const firstVisibleDate = new Date(`${safeCells[firstInRangeIndex].dateKey}T00:00:00`);
    if (!Number.isNaN(firstVisibleDate.getTime())) {
        const firstWeek = Math.floor(firstInRangeIndex / DAYS_IN_WEEK);
        labels.push({
            weekIndex: firstWeek,
            label: monthFormatter.format(firstVisibleDate),
        });
        seenMonths.add(`${firstVisibleDate.getFullYear()}-${firstVisibleDate.getMonth()}`);
        seenWeeks.add(firstWeek);
    }

    safeCells.forEach((cell, index) => {
        if (!cell?.inRange || !cell?.dateKey) return;

        const date = new Date(`${cell.dateKey}T00:00:00`);
        if (Number.isNaN(date.getTime()) || date.getDate() !== 1) return;

        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        const weekIndex = Math.floor(index / DAYS_IN_WEEK);

        if (seenMonths.has(monthKey) || seenWeeks.has(weekIndex)) return;

        labels.push({
            weekIndex,
            label: monthFormatter.format(date),
        });
        seenMonths.add(monthKey);
        seenWeeks.add(weekIndex);
    });

    return labels.sort((a, b) => a.weekIndex - b.weekIndex);
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
    const totalWeeks = Math.ceil(safeData.cells.length / DAYS_IN_WEEK);
    const monthLabels = getMonthLabels(safeData.cells);

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
                        <div className="contrib-grid-scroller">
                            {totalWeeks > 0 && (
                                <div
                                    className="contrib-months"
                                    style={{ gridTemplateColumns: `repeat(${totalWeeks}, 0.7rem)` }}
                                >
                                    {monthLabels.map((monthLabel) => (
                                        <span
                                            key={`${monthLabel.weekIndex}-${monthLabel.label}`}
                                            className="contrib-month-label"
                                            style={{ gridColumn: `${monthLabel.weekIndex + 1} / span 1` }}
                                        >
                                            {monthLabel.label}
                                        </span>
                                    ))}
                                </div>
                            )}

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
