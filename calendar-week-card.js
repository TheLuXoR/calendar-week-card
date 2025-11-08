class CalendarWeekCard extends HTMLElement {
    constructor() {
        super();
        this.weekOffset = 0;
        this.lastEvents = [];
        this.dynamicEntities = [];
        this.availableCalendars = [];
        this.configHiddenKey = "calendar-week-card-hidden";
        this.zoomSettingsKey = "calendar-week-card-zoom";
        this.hiddenTopMinutes = 0;
        this.hiddenBottomMinutes = 0;
        this.visibleMinutes = 24 * 60;
        this.pixelsPerMinute = 1;
        this._colorCanvas = null;
        this._colorContext = null;
    }

    setConfig(config) {
        this.config = structuredClone(config) || {};
        this.config.colors = this.config.colors || {};
        this.config.hidden_entities = Array.isArray(this.config.hidden_entities) ? this.config.hidden_entities : [];
        this.config.dynamic_zoom = this.normalizeZoomSettings(this.config.dynamic_zoom);
        this.dynamicEntities = [];
        this.availableCalendars = [];
        this._entitiesPromise = undefined;

        // Load saved colors
        const savedColors = localStorage.getItem("calendar-week-card-colors");
        if (savedColors) {
            this.config.colors = { ...this.config.colors, ...JSON.parse(savedColors) };
        }

        const savedHidden = localStorage.getItem(this.configHiddenKey);
        if (savedHidden) {
            try {
                const parsedHidden = JSON.parse(savedHidden);
                if (Array.isArray(parsedHidden)) {
                    const merged = new Set([
                        ...this.config.hidden_entities,
                        ...parsedHidden
                    ]);
                    this.config.hidden_entities = Array.from(merged);
                }
            } catch (err) {
                console.warn("calendar-week-card: Failed to parse saved hidden calendars", err);
            }
        }

        const savedZoom = localStorage.getItem(this.zoomSettingsKey);
        if (savedZoom) {
            try {
                const parsedZoom = JSON.parse(savedZoom);
                if (parsedZoom && typeof parsedZoom === "object") {
                    this.config.dynamic_zoom = this.normalizeZoomSettings({
                        ...this.config.dynamic_zoom,
                        ...parsedZoom
                    });
                }
            } catch (err) {
                console.warn("calendar-week-card: Failed to parse saved zoom settings", err);
            }
        }

        // Assign distinct pastel colors if missing
        if (this.config.entities) {
            this.assignDefaultColors(this.config.entities);
        }

        this.attachShadow({mode: "open"});

        this.shadowRoot.innerHTML = `
        <style>
            :host { display: flex; flex-direction: column; height: 100%; width: 100%; box-sizing: border-box; }
            .header-bar { display: flex; align-items: center; margin-bottom: 6px; padding-top: 6px; }
            .header-bar h3 { margin: 0; font-size: 1.1em; font-weight: bold; flex: 1; text-align: center; }
            .nav-buttons { display: flex; gap: 4px; }
            .nav-buttons button { border: none; background: none; cursor: pointer; font-size: 1.2em; color: var(--primary-color, #4287f5); }
            .settings-icon {cursor:pointer; margin-left:8px;}
            .week-header { display: grid; grid-template-columns: 60px repeat(7, 1fr); text-align: center; font-weight: bold; padding-bottom: 4px; }
            .week-header div { display: flex; flex-direction: column; align-items: center; }
            .day-num { font-size: 0.8em; font-weight: normal; color: #666; }
            .week-body { flex: 1; display: flex; flex-direction: column; width: 100%; height: 100%; border: 1px solid #ccc; overflow: hidden; }
            .all-day-row { display: flex; border-bottom: 1px solid #ccc; background: linear-gradient(to bottom, #f4f5fb, #ffffff); }
            .all-day-label { width: 60px; border-right: 1px solid #ccc; font-size: 11px; color: #666; padding: 6px 4px; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: flex-start; justify-content: center; }
            .all-day-grid { flex: 1; display: grid; grid-template-columns: repeat(7, 1fr); background: #fafbff; }
            .all-day-column { border-left: 1px solid #ddd; padding: 6px 6px 4px; min-height: 32px; display: flex; flex-direction: column; gap: 6px; position: relative; }
            .all-day-column:first-child { border-left: none; }
            .all-day-event { border-radius: 8px; padding: 6px 8px; font-size: 11px; font-weight: 600; color: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.18); position: relative; overflow: hidden; backdrop-filter: blur(0.3px); min-height: 28px; display: flex; flex-direction: column; justify-content: center; gap: 2px; }
            .all-day-event .all-day-title { display: block; }
            .all-day-event .all-day-flags { font-size: 9px; opacity: 0.85; margin-top: 2px; display: flex; gap: 4px; align-items: center; }
            .timed-row { flex: 1; display: flex; min-height: 0; }
            .time-bar { position: relative; width: 60px; border-right: 1px solid #ccc; font-size: 11px; background: #fafafa; flex-shrink: 0; overflow-y: auto; }
            .hour-label { position: absolute; left: 2px; font-size: 11px; color: #666; transform: translateY(-50%); }
            .week-grid { position: relative; flex: 1; display: grid; grid-template-columns: repeat(7, 1fr); height: 100%; width: 100%; overflow-y: auto; background: linear-gradient(to bottom,#e8e8e8 0%,#e8e8e8 25%,#f9f9f9 25%,#f9f9f9 91.6%,#e8e8e8 91.6%,#e8e8e8 100%); }
            .day-column { position: relative; border-left: 1px solid #ddd; overflow: hidden; background: transparent; }
            .day-column:first-child { border-left: none; }
            .event {position: absolute;left: 2px;color: white;border-radius: 4px;padding: 2px 4px;font-size: 11px;overflow: hidden;box-shadow: 0 2px 6px rgba(0,0,0,0.3);}
            .time-line {position: absolute; left: 0; right: 0; height: 2px; background: red; z-index: 20; box-shadow: 0 0 1px 1px rgba(255,255,255,0.4);}
        </style>

        <div class="header-bar">
          <div class="nav-buttons">
            <button class="prev-week">◀</button>
            <button class="today">Today</button>
            <button class="next-week">▶</button>
          </div>
          <h3 class="title-line"></h3>
          <span class="settings-icon">⚙️</span>
        </div>

        <div class="week-header"></div>

        <div class="week-body">
            <div class="all-day-row">
                <div class="all-day-label">All day</div>
                <div class="all-day-grid">
                    ${[...Array(7)].map(() => `<div class="all-day-column"></div>`).join("")}
                </div>
            </div>
            <div class="timed-row">
                <div class="time-bar"></div>
                <div class="week-grid">
                    ${[...Array(7)].map(() => `<div class="day-column"></div>`).join("")}
                </div>
            </div>
        </div>
        `;

        this.grid = this.shadowRoot.querySelector(".week-grid");
        this.timeBar = this.shadowRoot.querySelector(".time-bar");
        this.header = this.shadowRoot.querySelector(".week-header");
        this.titleLine = this.shadowRoot.querySelector(".title-line");
        this.dayColumns = this.shadowRoot.querySelectorAll(".day-column");
        this.allDayColumns = this.shadowRoot.querySelectorAll(".all-day-column");
        this.allDayRow = this.shadowRoot.querySelector(".all-day-row");

        this.shadowRoot.querySelector(".prev-week").addEventListener("click", () => this.changeWeek(-1));
        this.shadowRoot.querySelector(".next-week").addEventListener("click", () => this.changeWeek(1));
        this.shadowRoot.querySelector(".today").addEventListener("click", () => this.resetToCurrentWeek());
        this.shadowRoot.querySelector(".settings-icon").addEventListener("click", () => this.showSettingsDialog());

        this.buildTimeLabels();
        this.updateHeader();
        this.updateTimeLine();
        setInterval(() => this.updateTimeLine(), 60000);
    }

    resetToCurrentWeek() {
        this.weekOffset = 0;
        this.updateHeader();
        if (this._hass) this.loadEvents(this._hass);
    }

    changeWeek(delta) {
        this.weekOffset += delta;
        this.updateHeader();
        if (this._hass) this.loadEvents(this._hass);
    }

    getWeekRange() {
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + this.weekOffset * 7);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return [monday, sunday];
    }

    updateHeader() {
        const [start, end] = this.getWeekRange();
        const monthStart = start.toLocaleDateString(undefined, {month: "long", year: "numeric"});
        const monthEnd = end.toLocaleDateString(undefined, {month: "long", year: "numeric"});
        this.titleLine.textContent = monthStart === monthEnd ? monthStart : `${monthStart} – ${monthEnd}`;

        const todayOffset = ((new Date().getDay() + 6) % 7);
        const days = [...Array(7)].map((_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return {
                name: d.toLocaleDateString(undefined, {weekday: "short"}),
                num: d.getDate(),
                isToday: i === todayOffset && this.weekOffset === 0
            };
        });

        this.header.innerHTML = `<div></div>` + days.map(d =>
            `<div style="color:${d.isToday ? 'var(--accent-color)' : 'inherit'};">
                <div>${d.name}</div>
                <div class="day-num">${d.num}</div>
            </div>`).join('');
    }

    buildTimeLabels() {
        const gridHeight = this.grid.clientHeight || 1440;
        this.pixelsPerMinute = gridHeight / this.getVisibleMinutes();
        this.timeBar.innerHTML = "";
        const visibleStart = this.hiddenTopMinutes;
        const visibleEnd = 24 * 60 - this.hiddenBottomMinutes;

        const appendLabel = (minutes, text) => {
            const label = document.createElement("div");
            label.className = "hour-label";
            label.textContent = text;
            label.style.top = `${(minutes - this.hiddenTopMinutes) * this.pixelsPerMinute}px`;
            this.timeBar.appendChild(label);
        };

        if (visibleStart > 0) {
            appendLabel(visibleStart, this.formatMinutes(visibleStart));
        }

        for (let h = 1; h < 24; h++) {
            const minutes = h * 60;
            if (minutes <= visibleStart || minutes >= visibleEnd) continue;
            appendLabel(minutes, `${h.toString().padStart(2, '0')}:00`);
        }

        if (visibleEnd < 24 * 60) {
            appendLabel(visibleEnd, this.formatMinutes(visibleEnd));
        }

        // Add timeline in left bar
        const now = new Date();
        if (this.weekOffset === 0) {
            const minutes = now.getHours() * 60 + now.getMinutes();
            if (minutes >= visibleStart && minutes <= visibleEnd) {
                const line = document.createElement("div");
                line.className = "time-line";
                line.style.left = "0";
                line.style.right = "0";
                line.style.top = `${(minutes - this.hiddenTopMinutes) * this.pixelsPerMinute}px`;
                this.timeBar.appendChild(line);
            }
        }
    }

    set hass(hass) {
        this._hass = hass;
        this.loadEvents(hass);
    }

    async loadEvents(hass) {
        await this.ensureEntities(hass);

        const entities = this.getActiveEntities();
        const visibleEntities = entities.filter(entity => !this.isEntityHidden(entity));

        if (!visibleEntities.length) {
            this.renderList([]);
            return;
        }

        const [start, end] = this.getWeekRange();
        let allEvents = [];

        for (const entity of visibleEntities) {
            try {
                const url = `calendars/${entity}?start=${start.toISOString()}&end=${end.toISOString()}`;
                const events = await hass.callApi("get", url);
                events.forEach(ev => {
                    const startRaw = ev.start?.dateTime || ev.start?.date;
                    const endRaw = ev.end?.dateTime || ev.end?.date;
                    if (!startRaw || !endRaw) return;
                    const startDate = new Date(startRaw);
                    const endDate = new Date(endRaw);
                    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return;
                    const isAllDaySource = Boolean(ev.start?.date && !ev.start?.dateTime) || Boolean(ev.end?.date && !ev.end?.dateTime);
                    const isWholeDayRange = this.isWholeDayRange(startDate, endDate);
                    allEvents.push({
                        calendar: entity,
                        title: ev.summary || "(no title)",
                        start: new Date(startDate.getTime()),
                        end: new Date(endDate.getTime()),
                        originalStart: new Date(startDate.getTime()),
                        originalEnd: new Date(endDate.getTime()),
                        color: ev.color,
                        isAllDay: isAllDaySource || isWholeDayRange
                    });
                });
            } catch (e) {
                console.error("Error fetching events:", entity, e);
            }
        }

        allEvents.sort((a, b) => a.start - b.start);
        this.renderList(allEvents);
    }
    renderList(events) {
        this.lastEvents = events;
        Array.from(this.dayColumns).forEach(col => col.innerHTML = "");
        Array.from(this.allDayColumns || []).forEach(col => col.innerHTML = "");

        const [startOfWeek] = this.getWeekRange();

        const visibleEvents = Array.isArray(events)
            ? events.filter(ev => !this.isEntityHidden(ev.calendar))
            : [];

        const dayData = Array.from({ length: 7 }, () => ({ allDay: [], timed: [] }));
        const timedSegments = [];

        visibleEvents.forEach(ev => {
            if (!(ev?.start instanceof Date) || !(ev?.end instanceof Date)) return;
            const eventStart = new Date(ev.start.getTime());
            const eventEnd = new Date(ev.end.getTime());
            if (eventEnd <= eventStart) return;

            const isAllDay = Boolean(ev.isAllDay) || this.isWholeDayRange(eventStart, eventEnd);

            for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
                const dayStart = new Date(startOfWeek);
                dayStart.setDate(startOfWeek.getDate() + dayOffset);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(dayStart);
                dayEnd.setDate(dayEnd.getDate() + 1);

                if (eventEnd <= dayStart || eventStart >= dayEnd) continue;

                if (isAllDay) {
                    const segment = {
                        ...ev,
                        start: new Date(Math.max(eventStart.getTime(), dayStart.getTime())),
                        end: new Date(Math.min(eventEnd.getTime(), dayEnd.getTime())),
                        originalStart: ev.originalStart ? new Date(ev.originalStart.getTime()) : new Date(eventStart.getTime()),
                        originalEnd: ev.originalEnd ? new Date(ev.originalEnd.getTime()) : new Date(eventEnd.getTime()),
                        continuesBefore: eventStart < dayStart,
                        continuesAfter: eventEnd > dayEnd
                    };
                    dayData[dayOffset].allDay.push(segment);
                } else {
                    const segmentStart = eventStart < dayStart ? dayStart : eventStart;
                    const segmentEnd = eventEnd > dayEnd ? dayEnd : eventEnd;
                    if (segmentEnd <= segmentStart) continue;
                    const segment = {
                        ...ev,
                        start: new Date(segmentStart.getTime()),
                        end: new Date(segmentEnd.getTime()),
                        originalStart: ev.originalStart ? new Date(ev.originalStart.getTime()) : new Date(eventStart.getTime()),
                        originalEnd: ev.originalEnd ? new Date(ev.originalEnd.getTime()) : new Date(eventEnd.getTime()),
                        continuesBefore: eventStart < dayStart,
                        continuesAfter: eventEnd > dayEnd
                    };
                    dayData[dayOffset].timed.push(segment);
                    timedSegments.push(segment);
                }
            }
        });

        this.applyDynamicZoom(timedSegments);

        const gridHeight = this.grid.clientHeight || 1440;
        this.pixelsPerMinute = gridHeight / this.getVisibleMinutes();

        let hasAllDayEvents = false;

        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const dayStart = new Date(startOfWeek);
            dayStart.setDate(startOfWeek.getDate() + dayOffset);
            dayStart.setHours(0, 0, 0, 0);

            const allDayColumn = this.allDayColumns?.[dayOffset];
            if (allDayColumn) {
                const allDayEvents = dayData[dayOffset].allDay.sort((a, b) => {
                    const aStart = a.originalStart || a.start;
                    const bStart = b.originalStart || b.start;
                    return aStart - bStart;
                });
                if (allDayEvents.length) {
                    hasAllDayEvents = true;
                }
                allDayEvents.forEach(segment => {
                    const eventDiv = document.createElement("div");
                    eventDiv.className = "all-day-event";
                    const color = this.getEventColor(segment);
                    eventDiv.style.background = this.colorToGradient(color);
                    eventDiv.style.color = this.getReadableTextColor(color);
                    eventDiv.style.border = `1px solid ${this.colorWithAlpha(color, 0.55)}`;
                    eventDiv.style.cursor = "pointer";

                    const title = document.createElement("span");
                    title.className = "all-day-title";
                    title.textContent = segment.title;
                    eventDiv.appendChild(title);

                    if (segment.continuesBefore || segment.continuesAfter) {
                        const flags = document.createElement("div");
                        flags.className = "all-day-flags";
                        if (segment.continuesBefore) {
                            const before = document.createElement("span");
                            before.textContent = "◀";
                            flags.appendChild(before);
                        }
                        if (segment.continuesAfter) {
                            const after = document.createElement("span");
                            after.textContent = "▶";
                            flags.appendChild(after);
                        }
                        if (flags.childElementCount) {
                            eventDiv.appendChild(flags);
                        }
                    }

                    eventDiv.addEventListener("click", () => this.showEventDialog(segment));
                    allDayColumn.appendChild(eventDiv);
                });
            }

            const timedColumn = this.dayColumns?.[dayOffset];
            if (!timedColumn) continue;

            const dayEvents = dayData[dayOffset].timed.sort((a, b) => {
                if (a.start.getTime() === b.start.getTime()) {
                    return (a.end.getTime() - b.end.getTime());
                }
                return a.start - b.start;
            });

            const activeStack = [];

            for (const segment of dayEvents) {
                for (let i = activeStack.length - 1; i >= 0; i--) {
                    if (activeStack[i].end <= segment.start) {
                        activeStack.splice(i, 1);
                    }
                }

                const usedColumns = new Set(activeStack.map(e => e.column));
                let column = 0;
                while (usedColumns.has(column)) column++;
                segment.column = column;
                activeStack.push(segment);

                const startMinutes = Math.max(0, Math.round((segment.start - dayStart) / 60000));
                const endMinutesRaw = Math.max(0, Math.round((segment.end - dayStart) / 60000));
                let endMinutes = Math.max(startMinutes, endMinutesRaw);
                endMinutes = Math.min(endMinutes, 24 * 60);
                const visibleStart = Math.max(startMinutes, this.hiddenTopMinutes);
                const visibleEnd = Math.max(visibleStart, Math.min(endMinutes, 24 * 60 - this.hiddenBottomMinutes));
                const duration = Math.max(visibleEnd - visibleStart, 15);
                const top = (visibleStart - this.hiddenTopMinutes) * this.pixelsPerMinute;
                const height = duration * this.pixelsPerMinute;

                const leftIndent = 2 + segment.column * 12;
                const rightIndent = 2 + segment.column * 2;

                const eventDiv = document.createElement("div");
                eventDiv.className = "event";
                eventDiv.style.top = `${top}px`;
                eventDiv.style.height = `${height}px`;
                eventDiv.style.left = `${leftIndent}px`;
                eventDiv.style.right = `${rightIndent}px`;
                const color = this.getEventColor(segment);
                eventDiv.style.backgroundColor = color;
                eventDiv.style.boxShadow = "0 2px 6px rgba(0,0,0,0.9)";

                const startStr = segment.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                const endStr = segment.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                eventDiv.innerHTML = `<div><b>${segment.title}</b></div><div style="font-size:10px;opacity:0.9;">${startStr} – ${endStr}</div>`;

                eventDiv.addEventListener("click", () => this.showEventDialog(segment));

                timedColumn.appendChild(eventDiv);
            }
        }

        if (this.allDayRow) {
            this.allDayRow.style.display = hasAllDayEvents ? "flex" : "none";
        }

        this.updateTimeLine();
        this.buildTimeLabels();
    }


    async ensureEntities(hass) {
        if (!hass) return;

        if (this.config?.entities?.length) {
            this.assignDefaultColors(this.config.entities);
            return;
        }

        if (this.dynamicEntities.length) {
            return;
        }

        if (this._entitiesPromise) {
            await this._entitiesPromise;
            return;
        }

        this._entitiesPromise = (async () => {
            try {
                const calendars = await hass.callApi("get", "calendars");
                const list = Array.isArray(calendars) ? calendars : [];
                this.availableCalendars = list.filter(cal => cal?.entity_id);
                this.dynamicEntities = this.availableCalendars.map(cal => cal.entity_id);
                this.assignDefaultColors(this.dynamicEntities);
            } catch (err) {
                console.error("calendar-week-card: Failed to load calendars", err);
                this.availableCalendars = [];
                this.dynamicEntities = [];
            }
        })();

        try {
            await this._entitiesPromise;
        } finally {
            this._entitiesPromise = undefined;
        }
    }

    getActiveEntities() {
        if (this.config?.entities?.length) {
            return this.config.entities;
        }
        return this.dynamicEntities;
    }

    getHiddenEntities() {
        return Array.isArray(this.config?.hidden_entities) ? this.config.hidden_entities : [];
    }

    isEntityHidden(entityId) {
        return this.getHiddenEntities().includes(entityId);
    }

    setEntityHidden(entityId, shouldHide) {
        const hiddenSet = new Set(this.getHiddenEntities());
        if (shouldHide) {
            hiddenSet.add(entityId);
        } else {
            hiddenSet.delete(entityId);
        }
        this.config.hidden_entities = Array.from(hiddenSet);
        localStorage.setItem(this.configHiddenKey, JSON.stringify(this.config.hidden_entities));
    }

    getCalendarName(entityId) {
        const calendar = this.availableCalendars?.find(cal => cal.entity_id === entityId);
        if (calendar?.name) return calendar.name;
        return entityId?.replace(/^calendar\./, "").replace(/_/g, " ") || "";
    }

    assignDefaultColors(entities = []) {
        if (!Array.isArray(entities)) return;
        const distinctHues = [0, 35, 70, 140, 210, 275, 320];
        entities.forEach((entity, i) => {
            if (!this.config.colors[entity]) {
                const hue = distinctHues[i % distinctHues.length];
                this.config.colors[entity] = `hsl(${hue}, 70%, 70%)`;
            }
        });
        localStorage.setItem("calendar-week-card-colors", JSON.stringify(this.config.colors));
    }

    getEventColor(ev) {
        return this.config.colors?.[ev?.calendar] || ev?.color || "#4287f5";
    }

    ensureColorContext() {
        if (!this._colorCanvas) {
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 1;
            this._colorCanvas = canvas;
            this._colorContext = canvas.getContext("2d");
        }
        return this._colorContext;
    }

    parseColor(color) {
        if (!color) return null;
        const ctx = this.ensureColorContext();
        if (!ctx) return null;
        try {
            ctx.fillStyle = color;
            const computed = ctx.fillStyle;
            if (!computed) return null;
            if (computed.startsWith("#")) {
                const hex = computed.slice(1);
                const parseHex = h => parseInt(h, 16);
                if (hex.length === 3) {
                    const r = parseHex(hex[0] + hex[0]);
                    const g = parseHex(hex[1] + hex[1]);
                    const b = parseHex(hex[2] + hex[2]);
                    return { r, g, b, a: 1 };
                }
                if (hex.length === 6) {
                    const r = parseHex(hex.slice(0, 2));
                    const g = parseHex(hex.slice(2, 4));
                    const b = parseHex(hex.slice(4, 6));
                    return { r, g, b, a: 1 };
                }
            }
            const match = computed.match(/rgba?\(([^)]+)\)/i);
            if (match) {
                const parts = match[1].split(/\s*,\s*/).map(Number);
                if (parts.length >= 3) {
                    const [r, g, b] = parts;
                    const a = parts.length >= 4 ? parts[3] : 1;
                    return { r, g, b, a };
                }
            }
        } catch (err) {
            return null;
        }
        return null;
    }

    colorToGradient(color) {
        const parsed = this.parseColor(color);
        if (!parsed) {
            return `linear-gradient(to bottom, ${color}, ${color}, rgba(255,255,255,0))`;
        }
        const { r, g, b } = parsed;
        return `linear-gradient(to bottom, rgba(${r},${g},${b},0.95), rgba(${r},${g},${b},0.65), rgba(${r},${g},${b},0))`;
    }

    colorWithAlpha(color, alpha = 1) {
        const parsed = this.parseColor(color);
        if (!parsed) return color;
        const { r, g, b } = parsed;
        const clamped = Math.max(0, Math.min(alpha, 1));
        return `rgba(${r},${g},${b},${clamped})`;
    }

    getReadableTextColor(color) {
        const parsed = this.parseColor(color);
        if (!parsed) return "#fff";
        const luminance = (0.299 * parsed.r + 0.587 * parsed.g + 0.114 * parsed.b) / 255;
        return luminance > 0.6 ? "#1a1a1a" : "#ffffff";
    }

    isWholeDayRange(start, end) {
        if (!(start instanceof Date) || !(end instanceof Date)) return false;
        if (end <= start) return false;
        const duration = end.getTime() - start.getTime();
        const startIsMidnight = start.getHours() === 0 && start.getMinutes() === 0 && start.getSeconds() === 0;
        const endIsMidnight = end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0;
        return startIsMidnight && endIsMidnight && duration >= 24 * 60 * 60 * 1000;
    }

    normalizeZoomSettings(settings = {}) {
        const defaults = { enabled: false, max_hidden_start: 360, max_hidden_end: 360 };
        const normalized = { ...defaults };
        if (settings && typeof settings === "object") {
            normalized.enabled = Boolean(settings.enabled);
            const start = Number(settings.max_hidden_start);
            const end = Number(settings.max_hidden_end);
            if (Number.isFinite(start) && start >= 0) {
                normalized.max_hidden_start = Math.min(start, 24 * 60);
            }
            if (Number.isFinite(end) && end >= 0) {
                normalized.max_hidden_end = Math.min(end, 24 * 60);
            }
        }
        return normalized;
    }

    saveZoomSettings() {
        localStorage.setItem(this.zoomSettingsKey, JSON.stringify(this.config.dynamic_zoom));
    }

    getVisibleMinutes() {
        return Math.max(60, 24 * 60 - this.hiddenTopMinutes - this.hiddenBottomMinutes);
    }

    applyDynamicZoom(events = []) {
        const settings = this.config.dynamic_zoom;
        this.hiddenTopMinutes = 0;
        this.hiddenBottomMinutes = 0;

        if (!settings?.enabled || !Array.isArray(events) || !events.length) {
            this.visibleMinutes = this.getVisibleMinutes();
            return;
        }

        let earliestStart = 24 * 60;
        let latestEnd = 0;

        events.forEach(ev => {
            if (!(ev?.start instanceof Date) || !(ev?.end instanceof Date)) return;
            const startMinutes = ev.start.getHours() * 60 + ev.start.getMinutes();
            let endMinutes = ev.end.getHours() * 60 + ev.end.getMinutes();
            const durationMinutes = Math.max(0, Math.round((ev.end - ev.start) / 60000));
            if (durationMinutes > 0) {
                endMinutes = startMinutes + durationMinutes;
            }
            if (endMinutes <= startMinutes) {
                endMinutes = startMinutes + 15;
            }
            endMinutes = Math.min(endMinutes, 24 * 60);
            if (startMinutes < earliestStart) earliestStart = startMinutes;
            if (endMinutes > latestEnd) latestEnd = endMinutes;
        });

        if (latestEnd <= earliestStart) {
            this.visibleMinutes = this.getVisibleMinutes();
            return;
        }

        const dayMinutes = 24 * 60;
        this.hiddenTopMinutes = Math.min(earliestStart, settings.max_hidden_start);
        this.hiddenBottomMinutes = Math.min(Math.max(dayMinutes - latestEnd, 0), settings.max_hidden_end);

        const totalHidden = this.hiddenTopMinutes + this.hiddenBottomMinutes;
        if (totalHidden >= dayMinutes) {
            this.hiddenTopMinutes = 0;
            this.hiddenBottomMinutes = 0;
        } else {
            const minVisible = 60; // always keep at least one hour visible
            const overflow = totalHidden - (dayMinutes - minVisible);
            if (overflow > 0) {
                if (this.hiddenBottomMinutes >= overflow) {
                    this.hiddenBottomMinutes -= overflow;
                } else {
                    const remaining = overflow - this.hiddenBottomMinutes;
                    this.hiddenBottomMinutes = 0;
                    this.hiddenTopMinutes = Math.max(0, this.hiddenTopMinutes - remaining);
                }
            }
        }

        this.visibleMinutes = this.getVisibleMinutes();
    }

    formatMinutes(totalMinutes) {
        const minutes = Math.max(0, Math.min(totalMinutes, 24 * 60));
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    }

    formatHours(totalMinutes) {
        if (!Number.isFinite(totalMinutes)) return "0";
        const hours = totalMinutes / 60;
        if (!Number.isFinite(hours)) return "0";
        return hours.toFixed(2).replace(/\.00$/, "").replace(/\.([0-9])0$/, ".$1");
    }

    

    updateTimeLine() {
        this.grid.querySelectorAll(".time-line").forEach(el => el.remove());
        const now = new Date();
        const [start, end] = this.getWeekRange();
        if (now < start || now > end) return;

        const todayOffset = (now.getDay() + 6) % 7;
        if (!this.dayColumns[todayOffset]) return;

        const minutes = now.getHours() * 60 + now.getMinutes();
        if (minutes < this.hiddenTopMinutes || minutes > (24 * 60 - this.hiddenBottomMinutes)) return;
        const line = document.createElement("div");
        line.className = "time-line";
        line.style.top = `${(minutes - this.hiddenTopMinutes) * this.pixelsPerMinute}px`;
        this.dayColumns[todayOffset].appendChild(line);
    }

    showSettingsDialog() {
        const existing = document.querySelector("#calendar-settings-dialog");
        if (existing) existing.remove();

        if (!this.getActiveEntities().length && this._hass) {
            this.ensureEntities(this._hass).then(() => this.showSettingsDialog());
            return;
        }

        const dialog = document.createElement("div");
        dialog.id = "calendar-settings-dialog";
        Object.assign(dialog.style, {
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.5)", display: "flex",
            justifyContent: "center", alignItems: "center", zIndex: 9999,
            fontFamily: "sans-serif"
        });
        dialog.addEventListener("click", e => { if (e.target === dialog) dialog.remove(); });

        const content = document.createElement("div");
        Object.assign(content.style, {
            background: "#fff", padding: "24px", borderRadius: "12px",
            minWidth: "360px", maxWidth: "90%", boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            display: "flex", flexDirection: "column", gap: "16px"
        });
        content.addEventListener("click", e => e.stopPropagation());

        const title = document.createElement("h3");
        title.textContent = "Calendar Settings";
        Object.assign(title.style, { margin: 0, fontSize: "1.3em", color: "#333" });
        content.appendChild(title);

        const zoomSection = document.createElement("div");
        zoomSection.style.display = "flex";
        zoomSection.style.flexDirection = "column";
        zoomSection.style.gap = "8px";

        const zoomHeader = document.createElement("h4");
        zoomHeader.textContent = "Dynamic Zoom";
        Object.assign(zoomHeader.style, { margin: "0", fontSize: "1.1em", color: "#333" });
        zoomSection.appendChild(zoomHeader);

        const zoomToggleRow = document.createElement("label");
        zoomToggleRow.style.display = "flex";
        zoomToggleRow.style.alignItems = "center";
        zoomToggleRow.style.gap = "8px";

        const zoomToggle = document.createElement("input");
        zoomToggle.type = "checkbox";
        zoomToggle.checked = Boolean(this.config.dynamic_zoom?.enabled);

        const zoomToggleText = document.createElement("span");
        zoomToggleText.textContent = "Enable automatic hiding of unused night hours";
        zoomToggleText.style.color = "#555";

        zoomToggleRow.appendChild(zoomToggle);
        zoomToggleRow.appendChild(zoomToggleText);
        zoomSection.appendChild(zoomToggleRow);

        const zoomInputsRow = document.createElement("div");
        zoomInputsRow.style.display = "flex";
        zoomInputsRow.style.flexWrap = "wrap";
        zoomInputsRow.style.gap = "12px";

        const createZoomInput = (labelText, valueMinutes, onChange) => {
            const wrapper = document.createElement("div");
            wrapper.style.display = "flex";
            wrapper.style.flexDirection = "column";
            wrapper.style.gap = "4px";

            const label = document.createElement("label");
            label.textContent = labelText;
            label.style.fontSize = "0.9em";
            label.style.color = "#555";

            const input = document.createElement("input");
            input.type = "number";
            input.min = "0";
            input.max = "23";
            input.step = "0.5";
            input.value = this.formatHours(valueMinutes);
            input.style.padding = "6px";
            input.style.borderRadius = "6px";
            input.style.border = "1px solid #ccc";
            input.addEventListener("change", () => {
                const sanitized = onChange(parseFloat(input.value));
                if (Number.isFinite(sanitized)) {
                    input.value = this.formatHours(sanitized);
                }
            });

            wrapper.appendChild(label);
            wrapper.appendChild(input);
            zoomInputsRow.appendChild(wrapper);
            return input;
        };

        const startInput = createZoomInput(
            "Max hours hidden before first event",
            this.config.dynamic_zoom.max_hidden_start,
            value => {
                const hours = Number.isFinite(value) ? Math.max(0, Math.min(value, 23)) : 0;
                this.config.dynamic_zoom.max_hidden_start = Math.round(hours * 60);
                this.config.dynamic_zoom = this.normalizeZoomSettings(this.config.dynamic_zoom);
                this.saveZoomSettings();
                this.renderList(this.lastEvents);
                return this.config.dynamic_zoom.max_hidden_start;
            }
        );

        const endInput = createZoomInput(
            "Max hours hidden after last event",
            this.config.dynamic_zoom.max_hidden_end,
            value => {
                const hours = Number.isFinite(value) ? Math.max(0, Math.min(value, 23)) : 0;
                this.config.dynamic_zoom.max_hidden_end = Math.round(hours * 60);
                this.config.dynamic_zoom = this.normalizeZoomSettings(this.config.dynamic_zoom);
                this.saveZoomSettings();
                this.renderList(this.lastEvents);
                return this.config.dynamic_zoom.max_hidden_end;
            }
        );

        zoomSection.appendChild(zoomInputsRow);
        content.appendChild(zoomSection);

        const updateZoomControls = () => {
            const enabled = Boolean(this.config.dynamic_zoom?.enabled);
            startInput.disabled = !enabled;
            endInput.disabled = !enabled;
            startInput.style.opacity = enabled ? "1" : "0.5";
            endInput.style.opacity = enabled ? "1" : "0.5";
            if (startInput.parentElement) startInput.parentElement.style.opacity = enabled ? "1" : "0.6";
            if (endInput.parentElement) endInput.parentElement.style.opacity = enabled ? "1" : "0.6";
        };

        zoomToggle.addEventListener("change", e => {
            this.config.dynamic_zoom.enabled = e.target.checked;
            this.config.dynamic_zoom = this.normalizeZoomSettings(this.config.dynamic_zoom);
            this.saveZoomSettings();
            updateZoomControls();
            this.renderList(this.lastEvents);
        });

        updateZoomControls();

        const colorsHeader = document.createElement("h4");
        colorsHeader.textContent = "Calendar Colors";
        Object.assign(colorsHeader.style, { margin: "8px 0 0 0", fontSize: "1.1em", color: "#333" });
        content.appendChild(colorsHeader);

        const list = document.createElement("div");
        list.style.display = "flex";
        list.style.flexDirection = "column";
        list.style.gap = "12px";

        this.getActiveEntities().forEach(entity => {
            const row = document.createElement("div");
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.style.gap = "12px";

            const toggle = document.createElement("input");
            toggle.type = "checkbox";
            toggle.checked = !this.isEntityHidden(entity);
            toggle.style.width = "16px";
            toggle.style.height = "16px";
            toggle.style.cursor = "pointer";

            const name = document.createElement("span");
            name.textContent = this.getCalendarName(entity);
            name.style.flex = "1";
            name.style.fontWeight = "500";
            name.style.color = "#555";

            const toggleLabel = document.createElement("label");
            toggleLabel.style.display = "flex";
            toggleLabel.style.alignItems = "center";
            toggleLabel.style.gap = "8px";
            toggleLabel.style.flex = "1";
            toggleLabel.appendChild(toggle);
            toggleLabel.appendChild(name);

            const picker = document.createElement("input");
            picker.type = "color";
            picker.value = this.config.colors[entity] || "#4287f5";
            picker.style.width = "40px";
            picker.style.height = "30px";
            picker.style.border = "none";
            picker.style.borderRadius = "0px";
            picker.style.cursor = "pointer";
            picker.disabled = this.isEntityHidden(entity);
            picker.style.opacity = picker.disabled ? "0.5" : "1";
            picker.addEventListener("input", e => {
                this.config.colors[entity] = e.target.value;
                localStorage.setItem("calendar-week-card-colors", JSON.stringify(this.config.colors));
                this.renderList(this.lastEvents);
            });

            const applyVisibility = hidden => {
                picker.disabled = hidden;
                picker.style.opacity = hidden ? "0.5" : "1";
                this.renderList(this.lastEvents);
                if (!hidden && this._hass) {
                    this.loadEvents(this._hass);
                }
            };

            toggle.addEventListener("change", e => {
                const hidden = !e.target.checked;
                this.setEntityHidden(entity, hidden);
                applyVisibility(hidden);
            });

            row.appendChild(toggleLabel);
            row.appendChild(picker);
            list.appendChild(row);
        });

        content.appendChild(list);

        const donateSection = document.createElement("div");
        Object.assign(donateSection.style, {
            marginTop: "8px",
            display: "flex",
            justifyContent: "center",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            textAlign: "center"
        });

        const supportText = document.createElement("span");
        supportText.textContent = "Like it? Support me via PayPal:";
        supportText.style.color = "#555";
        supportText.style.fontSize = "0.9em";
        donateSection.appendChild(supportText);

        const donateLink = document.createElement("a");
        donateLink.href = "https://www.paypal.com/donate/?hosted_button_id=ABUTP5VLEUBS4";
        donateLink.target = "_blank";
        donateLink.rel = "noopener noreferrer";
        donateLink.style.display = "inline-flex";
        donateLink.style.alignItems = "center";

        const donateImage = document.createElement("img");
        donateImage.src = "https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif";
        donateImage.alt = "Donate with PayPal";
        donateImage.style.border = "0";

        donateLink.appendChild(donateImage);
        donateSection.appendChild(donateLink);
        content.appendChild(donateSection);

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "Save & Close";
        Object.assign(closeBtn.style, {
            marginTop: "16px", padding: "10px 18px", fontSize: "1em",
            borderRadius: "8px", border: "none", cursor: "pointer",
            background: "linear-gradient(90deg,#4D96FF,#6BCB77)", color: "#fff",
            fontWeight: "600", transition: "transform 0.1s, box-shadow 0.2s"
        });
        closeBtn.addEventListener("mouseenter", () => {
            closeBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
            closeBtn.style.transform = "translateY(-1px)";
        });
        closeBtn.addEventListener("mouseleave", () => {
            closeBtn.style.boxShadow = "none";
            closeBtn.style.transform = "translateY(0)";
        });
        closeBtn.addEventListener("click", () => dialog.remove());
        content.appendChild(closeBtn);

        dialog.appendChild(content);
        document.body.appendChild(dialog);
    }

    showEventDialog(ev) {
        const existing = document.querySelector("#calendar-event-dialog");
        if (existing) existing.remove();

        const dialog = document.createElement("div");
        dialog.id = "calendar-event-dialog";
        Object.assign(dialog.style, {
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.5)", display: "flex",
            justifyContent: "center", alignItems: "center", zIndex: 9999,
            fontFamily: "sans-serif"
        });
        dialog.addEventListener("click", e => { if (e.target === dialog) dialog.remove(); });

        const content = document.createElement("div");
        Object.assign(content.style, {
            background: "#fff", padding: "24px", borderRadius: "12px",
            minWidth: "360px", maxWidth: "90%", boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            display: "flex", flexDirection: "column", gap: "16px"
        });
        content.addEventListener("click", e => e.stopPropagation());

        const title = document.createElement("h3");
        title.textContent = ev.title;
        Object.assign(title.style, { margin: 0, fontSize: "1.3em", color: "#333" });
        content.appendChild(title);

        const originalStart = ev.originalStart instanceof Date ? ev.originalStart : ev.start;
        const originalEnd = ev.originalEnd instanceof Date ? ev.originalEnd : ev.end;
        const startDate = originalStart.toLocaleString(undefined, {weekday: "long", year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit"});
        const endDate = originalEnd.toLocaleString(undefined, {weekday: "long", year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit"});

        const details = document.createElement("div");
        details.innerHTML = `
        <p style="margin:0; color:#555;"><b>Calendar:</b> ${this.getCalendarName(ev.calendar)}</p>
        <p style="margin:0; color:#555;"><b>Start:</b> ${startDate}</p>
        <p style="margin:0; color:#555;"><b>End:</b> ${endDate}</p>
    `;
        content.appendChild(details);

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "Close";
        Object.assign(closeBtn.style, {
            marginTop: "16px", padding: "10px 18px", fontSize: "1em",
            borderRadius: "8px", border: "none", cursor: "pointer",
            background: "#4287f5", color: "#fff", fontWeight: "600"
        });
        closeBtn.addEventListener("click", () => dialog.remove());

        content.appendChild(closeBtn);
        dialog.appendChild(content);
        document.body.appendChild(dialog);
    }

    getCardSize() {
        return 3;
    }

    static getStubConfig() {
        return { title: "Familien Kalender", entities: [], colors: {} };
    }
}

if (!customElements.get("calendar-week-card")) {
    customElements.define("calendar-week-card", CalendarWeekCard);
}