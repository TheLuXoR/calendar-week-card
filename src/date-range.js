export const VIEW_MODE_WEEK = "week";
export const VIEW_MODE_ROLLING = "rolling";
export const DEFAULT_DAYS_TO_SHOW = 7;
export const MIN_DAYS_TO_SHOW = 3;
export const MAX_DAYS_TO_SHOW = 10;

export function normalizeViewMode(value) {
    return value === VIEW_MODE_ROLLING ? VIEW_MODE_ROLLING : VIEW_MODE_WEEK;
}

export function normalizeDaysToShow(value) {
    if (value === null || value === undefined || value === "") {
        return DEFAULT_DAYS_TO_SHOW;
    }

    const numericValue = Number(value);
    if (!Number.isInteger(numericValue)) {
        return DEFAULT_DAYS_TO_SHOW;
    }

    return Math.min(Math.max(numericValue, MIN_DAYS_TO_SHOW), MAX_DAYS_TO_SHOW);
}

export function getDisplayDayCount(viewMode, daysToShow) {
    return normalizeViewMode(viewMode) === VIEW_MODE_ROLLING
        ? normalizeDaysToShow(daysToShow)
        : DEFAULT_DAYS_TO_SHOW;
}

export function getDisplayRange({
    now = new Date(),
    viewMode = VIEW_MODE_WEEK,
    daysToShow = DEFAULT_DAYS_TO_SHOW,
    pageOffset = 0
} = {}) {
    const normalizedMode = normalizeViewMode(viewMode);
    const dayCount = getDisplayDayCount(normalizedMode, daysToShow);
    const normalizedOffset = Number.isInteger(Number(pageOffset)) ? Number(pageOffset) : 0;
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (normalizedMode === VIEW_MODE_WEEK) {
        const daysSinceMonday = (start.getDay() + 6) % 7;
        start.setDate(start.getDate() - daysSinceMonday + normalizedOffset * 7);
    } else {
        start.setDate(start.getDate() + normalizedOffset * dayCount);
    }

    const end = new Date(start);
    end.setDate(start.getDate() + dayCount);
    end.setMilliseconds(end.getMilliseconds() - 1);

    return { start, end, dayCount };
}

export function getCalendarDayIndex(date, rangeStart, dayCount) {
    if (!(date instanceof Date) || !(rangeStart instanceof Date)) {
        return -1;
    }

    const dateDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const startDay = Date.UTC(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    const index = Math.round((dateDay - startDay) / (24 * 60 * 60 * 1000));
    return index >= 0 && index < dayCount ? index : -1;
}
