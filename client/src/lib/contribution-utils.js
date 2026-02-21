export const DEFAULT_DAYS_TO_SHOW = 365;
export const DEFAULT_WEEKS_TO_SHOW = 53;

const DAY_MS = 24 * 60 * 60 * 1000;

export const toDateKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const local = new Date(date);
    local.setHours(0, 0, 0, 0);

    const year = local.getFullYear();
    const month = String(local.getMonth() + 1).padStart(2, '0');
    const day = String(local.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const getContributionLevel = (count, maxCount) => {
    if (count <= 0 || maxCount <= 0) return 0;
    if (maxCount === 1) return 4;

    const ratio = count / maxCount;
    if (ratio < 0.25) return 1;
    if (ratio < 0.5) return 2;
    if (ratio < 0.75) return 3;
    return 4;
};

const calculateStreak = (countsByDate, startDate, endDate) => {
    let streak = 0;
    const cursor = new Date(endDate);

    while (cursor >= startDate) {
        const key = toDateKey(cursor);
        if (!key || !countsByDate[key]) break;
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
};

export const createContributionData = (countsByDate = {}, daysToShow = DEFAULT_DAYS_TO_SHOW) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (daysToShow - 1));

    const gridStart = new Date(startDate);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());

    const totalGridDays = Math.floor((today.getTime() - gridStart.getTime()) / DAY_MS) + 1;

    let totalCommits = 0;
    let activeDays = 0;
    let maxCommits = 0;

    const rawCells = Array.from({ length: totalGridDays }).map((_, index) => {
        const date = new Date(gridStart);
        date.setDate(gridStart.getDate() + index);

        const inRange = date >= startDate && date <= today;
        const dateKey = toDateKey(date);
        const count = inRange && dateKey ? (countsByDate[dateKey] || 0) : 0;

        if (inRange) {
            totalCommits += count;
            if (count > 0) activeDays += 1;
            if (count > maxCommits) maxCommits = count;
        }

        return {
            dateKey,
            count,
            inRange,
        };
    });

    const cells = rawCells.map((cell) => ({
        ...cell,
        level: cell.inRange ? getContributionLevel(cell.count, maxCommits) : 0,
    }));

    return {
        cells,
        totalCommits,
        activeDays,
        maxCommits,
        streak: calculateStreak(countsByDate, startDate, today),
    };
};

export const buildContributionDataFromVersions = (versions = [], daysToShow = DEFAULT_DAYS_TO_SHOW) => {
    const countsByDate = {};

    versions.forEach((version) => {
        const dateKey = toDateKey(version?.createdAt);
        if (!dateKey) return;
        countsByDate[dateKey] = (countsByDate[dateKey] || 0) + 1;
    });

    return createContributionData(countsByDate, daysToShow);
};

export const buildContributionDataFromVersionLists = (versionLists = [], daysToShow = DEFAULT_DAYS_TO_SHOW) => {
    const countsByDate = {};

    versionLists.forEach((versions) => {
        const safeVersions = Array.isArray(versions) ? versions : [];

        safeVersions.forEach((version) => {
            const dateKey = toDateKey(version?.createdAt);
            if (!dateKey) return;
            countsByDate[dateKey] = (countsByDate[dateKey] || 0) + 1;
        });
    });

    return createContributionData(countsByDate, daysToShow);
};
