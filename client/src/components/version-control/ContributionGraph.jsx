import { GitCommitHorizontal, CalendarDays, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS_IN_WEEK = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const EMPTY_GRAPH_DATA = {
    cells: [],
    totalCommits: 0,
    activeDays: 0,
    streak: 0,
};

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' });
const rangeFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const WEEKDAY_RAIL_LABELS = {
    1: 'Mon',
    3: 'Wed',
    5: 'Fri',
};

const createPlaceholderCell = () => ({
    dateKey: null,
    count: 0,
    inRange: false,
    level: 0,
    isPlaceholder: true,
});

const parseDateKey = (dateKey) => {
    if (!dateKey) return null;
    const date = new Date(`${dateKey}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
};

const getWeekAnchorDate = (weekCells = []) => {
    const inRangeDates = weekCells
        .filter((cell) => cell?.inRange && cell?.dateKey)
        .map((cell) => parseDateKey(cell.dateKey))
        .filter(Boolean);

    const monthStartInWeek = inRangeDates.find((date) => date.getDate() === 1);
    if (monthStartInWeek) return monthStartInWeek;

    if (inRangeDates.length > 0) {
        return inRangeDates[0];
    }

    const fallbackDates = weekCells
        .filter((cell) => cell?.dateKey)
        .map((cell) => parseDateKey(cell.dateKey))
        .filter(Boolean);

    return fallbackDates[0] || null;
};

const getMonthGroups = (cells = []) => {
    const safeCells = Array.isArray(cells) ? cells : [];
    if (safeCells.length === 0) return [];

    const weeks = [];
    for (let index = 0; index < safeCells.length; index += DAYS_IN_WEEK) {
        const weekCells = safeCells.slice(index, index + DAYS_IN_WEEK);
        while (weekCells.length < DAYS_IN_WEEK) {
            weekCells.push(createPlaceholderCell());
        }

        const anchorDate = getWeekAnchorDate(weekCells);
        const monthKey = anchorDate
            ? `${anchorDate.getFullYear()}-${String(anchorDate.getMonth() + 1).padStart(2, '0')}`
            : `unknown-${weeks.length}`;

        weeks.push({
            key: `week-${index / DAYS_IN_WEEK}`,
            cells: weekCells,
            monthKey,
            monthLabel: anchorDate ? monthFormatter.format(anchorDate) : '',
        });
    }

    const groups = [];
    weeks.forEach((week) => {
        const previous = groups[groups.length - 1];
        if (!previous || previous.monthKey !== week.monthKey) {
            groups.push({
                monthKey: week.monthKey,
                monthLabel: week.monthLabel,
                weeks: [week],
            });
            return;
        }

        previous.weeks.push(week);
    });

    return groups;
};

const getInRangeBounds = (cells = []) => {
    const dates = cells
        .filter((cell) => cell?.inRange && cell?.dateKey)
        .map((cell) => parseDateKey(cell.dateKey))
        .filter(Boolean);

    if (dates.length === 0) return null;

    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    const daysCovered = Math.floor((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1;

    return {
        startDate,
        endDate,
        daysCovered,
        startLabel: rangeFormatter.format(startDate),
        endLabel: rangeFormatter.format(endDate),
    };
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const range = rangeLabel || 'Last 365 days';
    const monthGroups = getMonthGroups(safeData.cells);
    const inRangeBounds = getInRangeBounds(safeData.cells);
    const contributionSummary = inRangeBounds
        ? `${safeData.totalCommits} contribution${safeData.totalCommits === 1 ? '' : 's'} in the last ${inRangeBounds.daysCovered} days`
        : 'No contribution data for this period';
    const dateSpan = inRangeBounds
        ? `${inRangeBounds.startLabel} - ${inRangeBounds.endLabel}`
        : 'Add resume commits to populate this heatmap';

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
                        <div className="contrib-grid-context">
                            <p className="contrib-grid-summary">{contributionSummary}</p>
                            <p className="contrib-grid-dates">{dateSpan}</p>
                        </div>
                        <div className="contrib-grid-body">
                            <div className="contrib-weekday-rail" aria-hidden="true">
                                <span className="contrib-weekday-spacer" />
                                <div className="contrib-weekday-grid">
                                    {Array.from({ length: DAYS_IN_WEEK }).map((_, rowIndex) => (
                                        <span key={`weekday-${rowIndex}`} className="contrib-weekday-label">
                                            {WEEKDAY_RAIL_LABELS[rowIndex] || ''}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="contrib-grid-scroller">
                                <div className="contrib-grid-track">
                                    {monthGroups.map((group) => (
                                        <div key={group.monthKey} className="contrib-month-group">
                                            <span className="contrib-month-label">{group.monthLabel}</span>
                                            <div className="contrib-month-weeks">
                                                {group.weeks.map((week) => (
                                                    <div key={week.key} className="contrib-week-column">
                                                        {week.cells.map((cell, rowIndex) => {
                                                            const cellDate = parseDateKey(cell.dateKey);
                                                            const tooltipDate = cellDate ? cellDate.toLocaleDateString() : '';
                                                            const isToday = Boolean(cellDate && cellDate.getTime() === todayTime);
                                                            const dayOfWeek = cellDate ? cellDate.getDay() : null;
                                                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                                            const tooltip = cell.inRange
                                                                ? `${cell.count === 0 ? 'No commits' : `${cell.count} commit${cell.count === 1 ? '' : 's'}`} on ${tooltipDate}`
                                                                : '';

                                                            return (
                                                                <span
                                                                    key={`${week.key}-${rowIndex}`}
                                                                    className={`contrib-cell level-${cell.level} ${cell.inRange ? '' : 'outside'} ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}`}
                                                                    title={tooltip}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="contrib-legend">
                            <span>Less</span>
                            <span className="contrib-cell contrib-legend-swatch level-0" />
                            <span className="contrib-cell contrib-legend-swatch level-1" />
                            <span className="contrib-cell contrib-legend-swatch level-2" />
                            <span className="contrib-cell contrib-legend-swatch level-3" />
                            <span className="contrib-cell contrib-legend-swatch level-4" />
                            <span>More</span>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
