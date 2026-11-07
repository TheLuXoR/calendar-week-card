import test from "node:test";
import assert from "node:assert/strict";

import {
    getCalendarDayIndex,
    getDisplayRange,
    normalizeDaysToShow,
    normalizeViewMode
} from "../src/date-range.js";

function assertLocalDate(date, year, month, day, hours, minutes, seconds, milliseconds) {
    assert.deepEqual(
        [
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            date.getSeconds(),
            date.getMilliseconds()
        ],
        [year, month, day, hours, minutes, seconds, milliseconds]
    );
}

test("week mode remains Monday through Sunday", () => {
    const { start, end, dayCount } = getDisplayRange({
        now: new Date(2026, 10, 8, 14, 30)
    });

    assert.equal(dayCount, 7);
    assertLocalDate(start, 2026, 10, 2, 0, 0, 0, 0);
    assertLocalDate(end, 2026, 10, 8, 23, 59, 59, 999);
});

test("seven-day rolling mode starts on Sunday and ends on Saturday", () => {
    const { start, end, dayCount } = getDisplayRange({
        now: new Date(2026, 10, 8, 14, 30),
        viewMode: "rolling",
        daysToShow: 7
    });

    assert.equal(dayCount, 7);
    assertLocalDate(start, 2026, 10, 8, 0, 0, 0, 0);
    assertLocalDate(end, 2026, 10, 14, 23, 59, 59, 999);
});

test("rolling mode supports 3-day and 10-day ranges across month and year boundaries", () => {
    const shortRange = getDisplayRange({
        now: new Date(2026, 11, 31, 12),
        viewMode: "rolling",
        daysToShow: 3
    });
    assertLocalDate(shortRange.end, 2027, 0, 2, 23, 59, 59, 999);

    const longRange = getDisplayRange({
        now: new Date(2026, 0, 28, 12),
        viewMode: "rolling",
        daysToShow: 10
    });
    assert.equal(longRange.dayCount, 10);
    assertLocalDate(longRange.end, 2026, 1, 6, 23, 59, 59, 999);
});

test("rolling navigation advances by the configured range length", () => {
    const next = getDisplayRange({
        now: new Date(2026, 10, 8, 12),
        viewMode: "rolling",
        daysToShow: 5,
        pageOffset: 1
    });
    const previous = getDisplayRange({
        now: new Date(2026, 10, 8, 12),
        viewMode: "rolling",
        daysToShow: 5,
        pageOffset: -1
    });

    assertLocalDate(next.start, 2026, 10, 13, 0, 0, 0, 0);
    assertLocalDate(previous.start, 2026, 10, 3, 0, 0, 0, 0);
});

test("range creation uses calendar arithmetic across daylight-saving boundaries", () => {
    const previousTimezone = process.env.TZ;
    process.env.TZ = "Europe/Berlin";
    try {
        const { start, end } = getDisplayRange({
            now: new Date(2026, 2, 28, 12),
            viewMode: "rolling",
            daysToShow: 3
        });

        assert.equal(start.getHours(), 0);
        assert.equal(end.getHours(), 23);
        assert.equal(end.getDate(), new Date(2026, 2, 30).getDate());
        assert.equal(getCalendarDayIndex(new Date(2026, 2, 29, 12), start, 3), 1);
        assert.equal(end.getTime() - start.getTime() + 1, 71 * 60 * 60 * 1000);
    } finally {
        if (previousTimezone === undefined) {
            delete process.env.TZ;
        } else {
            process.env.TZ = previousTimezone;
        }
    }
});

test("configuration normalization clamps integer counts and rejects invalid values", () => {
    assert.equal(normalizeViewMode("rolling"), "rolling");
    assert.equal(normalizeViewMode("other"), "week");
    assert.equal(normalizeDaysToShow(2), 3);
    assert.equal(normalizeDaysToShow(11), 10);
    assert.equal(normalizeDaysToShow("6"), 6);
    assert.equal(normalizeDaysToShow(4.5), 7);
    assert.equal(normalizeDaysToShow("invalid"), 7);
});
