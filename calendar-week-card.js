const CALENDAR_WEEK_CARD_TRANSLATIONS = {
    en: {
        today: "Today",
        calendarColors: "Calendar Colors",
        supportViaPaypal: "Like it? Support me via PayPal:",
        saveAndClose: "Save & Close",
        close: "Close",
        calendar: "Calendar",
        start: "Start",
        end: "End",
        noTitle: "(no title)",
        languageLabel: "Language",
        systemDefault: "System default",
        donateWithPaypal: "Donate with PayPal"
    },
    de: {
        today: "Heute",
        calendarColors: "Kalenderfarben",
        supportViaPaypal: "Gefällt dir die Karte? Unterstütze mich via PayPal:",
        saveAndClose: "Speichern & Schließen",
        close: "Schließen",
        calendar: "Kalender",
        start: "Beginn",
        end: "Ende",
        noTitle: "(kein Titel)",
        languageLabel: "Sprache",
        systemDefault: "Systemstandard",
        donateWithPaypal: "Mit PayPal spenden"
    },
    fr: {
        today: "Aujourd'hui",
        calendarColors: "Couleurs du calendrier",
        supportViaPaypal: "Vous aimez ? Soutenez-moi via PayPal :",
        saveAndClose: "Enregistrer et fermer",
        close: "Fermer",
        calendar: "Calendrier",
        start: "Début",
        end: "Fin",
        noTitle: "(sans titre)",
        languageLabel: "Langue",
        systemDefault: "Langue du système",
        donateWithPaypal: "Faire un don avec PayPal"
    },
    es: {
        today: "Hoy",
        calendarColors: "Colores del calendario",
        supportViaPaypal: "¿Te gusta? Apóyame vía PayPal:",
        saveAndClose: "Guardar y cerrar",
        close: "Cerrar",
        calendar: "Calendario",
        start: "Inicio",
        end: "Fin",
        noTitle: "(sin título)",
        languageLabel: "Idioma",
        systemDefault: "Predeterminado del sistema",
        donateWithPaypal: "Donar con PayPal"
    },
    it: {
        today: "Oggi",
        calendarColors: "Colori del calendario",
        supportViaPaypal: "Ti piace? Sostienimi tramite PayPal:",
        saveAndClose: "Salva e chiudi",
        close: "Chiudi",
        calendar: "Calendario",
        start: "Inizio",
        end: "Fine",
        noTitle: "(senza titolo)",
        languageLabel: "Lingua",
        systemDefault: "Predefinito di sistema",
        donateWithPaypal: "Dona con PayPal"
    },
    nl: {
        today: "Vandaag",
        calendarColors: "Kalenderkleuren",
        supportViaPaypal: "Vind je het leuk? Steun me via PayPal:",
        saveAndClose: "Opslaan en sluiten",
        close: "Sluiten",
        calendar: "Agenda",
        start: "Start",
        end: "Einde",
        noTitle: "(geen titel)",
        languageLabel: "Taal",
        systemDefault: "Systeemstandaard",
        donateWithPaypal: "Doneren met PayPal"
    }
};

const CALENDAR_WEEK_CARD_LANGUAGE_NAMES = {
    en: "English",
    de: "Deutsch",
    fr: "Français",
    es: "Español",
    it: "Italiano",
    nl: "Nederlands"
};

class CalendarWeekCard extends HTMLElement {
    constructor() {
        super();
        this.weekOffset = 0;
        this.lastEvents = [];
        this.dynamicEntities = [];
        this.availableCalendars = [];
        this.configHiddenKey = "calendar-week-card-hidden";
        this.pixelsPerMinute = 1;
        this.timeAxisOffset = 0;
        this.timeViewportHeight = 24 * 60;
        this.columnPaddingTop = 6;
        this.columnPaddingBottom = 12;
        this.allDayRowHeight = 22;
        this.allDayRowOverlap = 8;
        this.languagePreference = "system";
        this.language = "en";
    }
    resolveLanguage(preference) {
        const normalize = lang => (lang || "").toString().toLowerCase().split("-")[0];
        const supported = Object.keys(CALENDAR_WEEK_CARD_TRANSLATIONS);

        if (preference && preference !== "system") {
            const normalizedPreference = normalize(preference);
            if (supported.includes(normalizedPreference)) {
                return normalizedPreference;
            }
        }

        const navigatorLanguages = [];
        if (typeof navigator !== "undefined") {
            if (navigator.language) {
                navigatorLanguages.push(navigator.language);
            }
            if (Array.isArray(navigator.languages)) {
                navigator.languages.forEach(lang => {
                    if (!navigatorLanguages.includes(lang)) {
                        navigatorLanguages.push(lang);
                    }
                });
            }
        }

        for (const lang of navigatorLanguages) {
            const normalized = normalize(lang);
            if (supported.includes(normalized)) {
                return normalized;
            }
        }

        return "en";
    }

    getLocale() {
        return this.language || "en";
    }

    t(key) {
        const locale = this.getLocale();
        const translations = CALENDAR_WEEK_CARD_TRANSLATIONS[locale] || CALENDAR_WEEK_CARD_TRANSLATIONS.en;
        return translations[key] || CALENDAR_WEEK_CARD_TRANSLATIONS.en[key] || key;
    }

    applyTranslations() {
        if (!this.shadowRoot) return;
        const todayButton = this.shadowRoot.querySelector(".today");
        if (todayButton) {
            const todayText = this.t("today");
            todayButton.textContent = todayText;
            todayButton.setAttribute("title", todayText);
            todayButton.setAttribute("aria-label", todayText);
        }

        const settingsIcon = this.shadowRoot.querySelector(".settings-icon");
        if (settingsIcon) {
            settingsIcon.setAttribute("title", this.t("calendarColors"));
            settingsIcon.setAttribute("aria-label", this.t("calendarColors"));
        }
    }

    setLanguagePreference(preference) {
        const normalize = lang => (lang || "").toString().toLowerCase().split("-")[0];
        const supported = Object.keys(CALENDAR_WEEK_CARD_TRANSLATIONS);
        if (preference !== "system") {
            const normalizedPreference = normalize(preference);
            this.languagePreference = supported.includes(normalizedPreference) ? normalizedPreference : "system";
        } else {
            this.languagePreference = "system";
        }

        this.language = this.resolveLanguage(this.languagePreference);
        this.config.language = this.languagePreference;
        localStorage.setItem("calendar-week-card-language", this.languagePreference);

        this.applyTranslations();
        this.updateHeader();
        const events = Array.isArray(this.lastEvents) ? [...this.lastEvents] : [];
        this.renderList(events);
    }

    setConfig(config) {
        this.config = structuredClone(config) || {};
        this.config.colors = this.config.colors || {};
        this.config.hidden_entities = Array.isArray(this.config.hidden_entities) ? this.config.hidden_entities : [];
        const storedLanguagePreference = localStorage.getItem("calendar-week-card-language");
        const configLanguage = typeof this.config.language === "string" ? this.config.language : null;
        this.languagePreference = configLanguage || storedLanguagePreference || "system";
        if (this.languagePreference !== "system") {
            const normalize = lang => (lang || "").toString().toLowerCase().split("-")[0];
            const normalized = normalize(this.languagePreference);
            this.languagePreference = Object.keys(CALENDAR_WEEK_CARD_TRANSLATIONS).includes(normalized) ? normalized : "system";
        }
        this.language = this.resolveLanguage(this.languagePreference);
        this.config.language = this.languagePreference;
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

        // Assign distinct pastel colors if missing
        if (this.config.entities) {
            this.assignDefaultColors(this.config.entities);
        }

        this.attachShadow({mode: "open"});

        this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: flex;
                flex-direction: column;
                height: 100%;
                max-height: 100vh;
                width: 100%;
                box-sizing: border-box;
                font-family: var(--primary-font-family, "Roboto", "Helvetica", sans-serif);
                color: var(--primary-text-color, #1f1f1f);
                overflow: hidden;
            }
            .header-bar {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
                padding: 8px 4px 0;
                gap: 6px;
            }
            .header-bar h3 {
                margin: 0;
                font-size: 1.2em;
                font-weight: 600;
                flex: 1;
                text-align: center;
                letter-spacing: 0.02em;
            }
            .nav-buttons {
                display: flex;
                gap: 6px;
            }
            .nav-buttons button {
                border: none;
                background: rgba(66, 135, 245, 0.08);
                color: var(--primary-color, #4287f5);
                cursor: pointer;
                font-size: 0.85em;
                padding: 6px 10px;
                border-radius: 8px;
                font-weight: 600;
                transition: background 0.2s ease, transform 0.2s ease;
            }
            .nav-buttons button:hover {
                background: rgba(66, 135, 245, 0.15);
                transform: translateY(-1px);
            }
            .settings-icon {
                cursor: pointer;
                margin-left: 4px;
                font-size: 1.1em;
                padding: 4px;
                border-radius: 50%;
                transition: background 0.2s ease;
            }
            .settings-icon:hover {
                background: rgba(0, 0, 0, 0.08);
            }
            .week-header {
                display: grid;
                grid-template-columns: 60px repeat(7, 1fr);
                text-align: center;
                font-weight: 600;
                padding: 0 6px 8px;
                color: var(--secondary-text-color, #5f6368);
            }
            .week-header div {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
            }
            .day-num {
                font-size: 0.85em;
                font-weight: 500;
                color: inherit;
            }
            .week-body {
                flex: 1;
                display: flex;
                width: 100%;
                height: 100%;
                border-radius: 16px;
                border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
                overflow: hidden;
                background: var(--card-background-color, #ffffff);
                box-shadow: 0 12px 28px rgba(15, 15, 30, 0.12);
                min-height: 0;
            }
            .time-bar {
                position: relative;
                width: 64px;
                border-right: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
                font-size: 11px;
                background: linear-gradient(180deg, rgba(245, 247, 250, 0.9) 0%, rgba(235, 238, 242, 0.8) 100%);
                flex-shrink: 0;
                overflow: hidden;
                min-height: 0;
            }
            .hour-label {
                position: absolute;
                left: 6px;
                font-size: 11px;
                color: var(--secondary-text-color, #6f6f6f);
                transform: translateY(-50%);
            }
            .week-grid {
                position: relative;
                flex: 1;
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                height: 100%;
                width: 100%;
                overflow: hidden;
                background: linear-gradient(to bottom, rgba(249,249,249,0.9) 0%, rgba(255,255,255,0.95) 65%, rgba(245,247,250,0.9) 100%);
                min-height: 0;
            }
            .day-column {
                position: relative;
                border-left: 1px solid rgba(0, 0, 0, 0.04);
                background: transparent;
                display: flex;
                flex-direction: column;
                padding: 6px 6px 12px;
                gap: 0;
                box-sizing: border-box;
                min-height: 0;
            }
            .day-column:first-child {
                border-left: none;
            }
            .timed-viewport {
                position: relative;
                flex: 1;
                width: 100%;
                min-height: 0;
            }
            .timed-events {
                position: relative;
                width: 100%;
                height: 100%;
                min-height: 0;
            }
            .event {
                border-radius: 10px;
                font-size: 12px;
                line-height: 1.3;
                overflow: hidden;
                box-shadow: 0 6px 14px rgba(15, 15, 30, 0.18);
                cursor: pointer;
                border: 1px solid rgba(255, 255, 255, 0.35);
                backdrop-filter: saturate(130%);
                transition: box-shadow 0.2s ease, transform 0.2s ease;
                box-sizing: border-box;
                padding: 0;
            }
            .event:hover {
                transform: translateY(-1px);
                box-shadow: 0 10px 20px rgba(15, 15, 30, 0.22);
            }
            .event.timed-event {
                position: absolute;
            }
            .event-surface {
                padding: 6px 8px;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                gap: 2px;
            }
            .event-surface.all-day-surface {
                padding: 3px 6px;
                flex-direction: row;
                align-items: center;
                gap: 4px;
            }
            .event.timed-event .event-surface {
                padding: 4px 8px;
                gap: 3px;
            }
            .event.all-day-event {
                position: absolute;
                font-weight: 600;
                z-index: 3;
            }
            .event.all-day-event .event-title {
                font-size: 0.8em;
                margin-bottom: 0;
                letter-spacing: 0.01em;
                flex: 1;
            }
            .event.all-day-event .event-title,
            .event.all-day-event .event-title * {
                min-width: 0;
            }
            .event-tag {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 999px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                padding: 1px 6px 0;
                line-height: 1.2;
                background: rgba(255, 255, 255, 0.25);
                color: inherit;
                white-space: nowrap;
            }
            .event-all-day-tag {
                font-size: 0.6em;
                margin-left: auto;
                opacity: 0.9;
            }
            .event-title {
                font-weight: 600;
                margin-bottom: 2px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                min-width: 0;
            }
            .event-time {
                font-size: 0.75em;
                opacity: 0.9;
            }
            .time-line {
                position: absolute;
                left: 0;
                right: 0;
                height: 2px;
                background: var(--accent-color, #ff3b30);
                z-index: 20;
                box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.45);
            }
        </style>

        <div class="header-bar">
          <div class="nav-buttons">
            <button class="prev-week">◀</button>
            <button class="today"></button>
            <button class="next-week">▶</button>
          </div>
          <h3 class="title-line"></h3>
          <span class="settings-icon">⚙️</span>
        </div>

        <div class="week-header"></div>

        <div class="week-body">
            <div class="time-bar"></div>
            <div class="week-grid">
                ${[...Array(7)].map(() => `<div class="day-column"></div>`).join("")}
            </div>
        </div>
        `;

        this.grid = this.shadowRoot.querySelector(".week-grid");
        this.timeBar = this.shadowRoot.querySelector(".time-bar");
        this.header = this.shadowRoot.querySelector(".week-header");
        this.titleLine = this.shadowRoot.querySelector(".title-line");
        this.dayColumns = this.shadowRoot.querySelectorAll(".day-column");

        this.colorResolver = document.createElement("div");
        this.colorResolver.style.display = "none";
        this.shadowRoot.appendChild(this.colorResolver);

        this.shadowRoot.querySelector(".prev-week").addEventListener("click", () => this.changeWeek(-1));
        this.shadowRoot.querySelector(".next-week").addEventListener("click", () => this.changeWeek(1));
        this.shadowRoot.querySelector(".today").addEventListener("click", () => this.resetToCurrentWeek());
        this.shadowRoot.querySelector(".settings-icon").addEventListener("click", () => this.showSettingsDialog());

        this.applyTranslations();
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
        const locale = this.getLocale();
        const monthStart = start.toLocaleDateString(locale, {month: "long", year: "numeric"});
        const monthEnd = end.toLocaleDateString(locale, {month: "long", year: "numeric"});
        this.titleLine.textContent = monthStart === monthEnd ? monthStart : `${monthStart} – ${monthEnd}`;

        const todayOffset = ((new Date().getDay() + 6) % 7);
        const days = [...Array(7)].map((_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return {
                name: d.toLocaleDateString(locale, {weekday: "short"}),
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
        if (!this.timeBar) return;
        this.timeBar.innerHTML = "";
        this.timeBar.style.minHeight = "";
        this.timeBar.style.height = "100%";
        this.timeBar.style.paddingTop = `${this.columnPaddingTop}px`;
        this.timeBar.style.paddingBottom = `${this.columnPaddingBottom}px`;
        for (let h = 1; h <= 23; h++) {
            const label = document.createElement("div");
            label.className = "hour-label";
            label.textContent = `${h.toString().padStart(2, '0')}:00`;
            label.style.top = `${this.timeAxisOffset + h * 60 * this.pixelsPerMinute}px`;
            this.timeBar.appendChild(label);
        }

        // Add timeline in left bar
        const now = new Date();
        if (this.weekOffset === 0) {
            const minutes = now.getHours() * 60 + now.getMinutes();
            const line = document.createElement("div");
            line.className = "time-line";
            line.style.left = "0";
            line.style.right = "0";
            line.style.top = `${this.timeAxisOffset + minutes * this.pixelsPerMinute}px`;
            this.timeBar.appendChild(line);
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
                    const startDate = new Date(ev.start.dateTime || ev.start.date);
                    const endDate = new Date(ev.end.dateTime || ev.end.date);
                    let isAllDay = !!ev.start?.date && !ev.start?.dateTime;

                    if (!isAllDay && ev.start?.dateTime && ev.end?.dateTime) {
                        const durationMinutes = (endDate - startDate) / (1000 * 60);
                        if (durationMinutes >= 24 * 60 && startDate.getHours() === 0 && startDate.getMinutes() === 0 && endDate.getHours() === 0 && endDate.getMinutes() === 0) {
                            isAllDay = true;
                        }
                    }

                    const hasSummary = typeof ev.summary === "string" && ev.summary.trim().length > 0;
                    allEvents.push({
                        calendar: entity,
                        title: hasSummary ? ev.summary : "",
                        isUntitled: !hasSummary,
                        start: startDate,
                        end: endDate,
                        color: ev.color,
                        isAllDay
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
        this.dayColumns.forEach(col => {
            col.innerHTML = `
                <div class="timed-viewport">
                    <div class="timed-events"></div>
                </div>
            `;
        });

        const [startOfWeek] = this.getWeekRange();

        const visibleEvents = Array.isArray(events)
            ? events.filter(ev => !this.isEntityHidden(ev.calendar))
            : [];

        const dayRenderData = [];

        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            // Get all events for this day, sorted by start time
            const allDayEvents = visibleEvents
                .filter(ev => {
                    const evDayOffset = Math.floor((ev.start - startOfWeek) / (1000 * 60 * 60 * 24));
                    return evDayOffset === dayOffset && ev.isAllDay;
                })
                .sort((a, b) => a.start - b.start);

            const dayEvents = visibleEvents
                .filter(ev => {
                    const evDayOffset = Math.floor((ev.start - startOfWeek) / (1000 * 60 * 60 * 24));
                    return evDayOffset === dayOffset && !ev.isAllDay;
                })
                .sort((a, b) => a.start - b.start);

            const dayColumn = this.dayColumns[dayOffset];
            const timedContainer = dayColumn.querySelector(".timed-events");
            dayRenderData.push({ dayEvents, allDayEvents, timedContainer });
        }

        this.allDayBandHeight = 0;
        this.updateTimeMetrics();

        const allDayOverlap = Math.min(this.allDayRowOverlap, this.allDayRowHeight - 4);
        const allDayRowStep = Math.max(this.allDayRowHeight - allDayOverlap, 4);
        const baseTopOffset = 0;

        for (const { dayEvents, allDayEvents, timedContainer } of dayRenderData) {
            if (!timedContainer) continue;
            const activeStack = [];

            allDayEvents.forEach((ev, index) => {
                const baseColor = this.config.colors[ev.calendar] || ev.color || "#4287f5";
                const gradientStart = this.mixColor(baseColor, "#000000", 0.18) || baseColor;
                const gradientEnd = this.mixColor(baseColor, "#ffffff", 0.45) || baseColor;
                const top = index * allDayRowStep;

                const eventDiv = document.createElement("div");
                eventDiv.className = "event all-day-event";
                eventDiv.style.top = `${top}px`;
                eventDiv.style.height = `${this.allDayRowHeight}px`;
                eventDiv.style.left = "2px";
                eventDiv.style.right = "2px";
                eventDiv.style.background = `linear-gradient(150deg, ${gradientStart}, ${gradientEnd})`;
                eventDiv.style.borderColor = this.mixColor(baseColor, "#ffffff", 0.3) || "rgba(255,255,255,0.35)";
                eventDiv.style.color = this.getReadableTextColor(gradientStart);

                const eventSurface = document.createElement("div");
                eventSurface.className = "event-surface all-day-surface";

                const titleEl = document.createElement("div");
                titleEl.className = "event-title";
                titleEl.textContent = ev.isUntitled ? this.t("noTitle") : ev.title;

                const timeEl = document.createElement("div");
                timeEl.className = "event-tag event-all-day-tag";
                timeEl.textContent = "All day";

                eventSurface.appendChild(titleEl);
                eventSurface.appendChild(timeEl);
                eventDiv.appendChild(eventSurface);

                eventDiv.addEventListener("click", () => this.showEventDialog(ev));
                timedContainer.appendChild(eventDiv);
            });

            for (const ev of dayEvents) {
                for (let i = activeStack.length - 1; i >= 0; i--) {
                    if (activeStack[i].end <= ev.start) activeStack.splice(i, 1);
                }

                let maxCol = -1;
                activeStack.forEach(e => { if (e.column > maxCol) maxCol = e.column; });
                ev.column = maxCol + 1;
                activeStack.push(ev);

                const startMinutes = ev.start.getHours() * 60 + ev.start.getMinutes();
                const endMinutes = ev.end.getHours() * 60 + ev.end.getMinutes();
                const top = baseTopOffset + startMinutes * this.pixelsPerMinute;
                const height = Math.max(endMinutes - startMinutes, 15) * this.pixelsPerMinute;

                const leftIndent = 2 + ev.column * 12;
                const rightIndent = 2 + ev.column * 2;

                const eventDiv = document.createElement("div");
                eventDiv.className = "event timed-event";
                eventDiv.style.top = `${top}px`;
                eventDiv.style.height = `${height}px`;
                eventDiv.style.left = `${leftIndent}px`;
                eventDiv.style.right = `${rightIndent}px`;
                const baseColor = this.config.colors[ev.calendar] || ev.color || "#4287f5";
                const gradientStart = this.mixColor(baseColor, "#000000", 0.2) || baseColor;
                const gradientEnd = this.mixColor(baseColor, "#ffffff", 0.3) || baseColor;
                eventDiv.style.background = `linear-gradient(160deg, ${gradientStart}, ${gradientEnd})`;
                eventDiv.style.borderColor = this.mixColor(baseColor, "#ffffff", 0.25) || "rgba(255,255,255,0.35)";
                eventDiv.style.color = this.getReadableTextColor(gradientStart);

                const locale = this.getLocale();
                const eventSurface = document.createElement("div");

                eventSurface.className = "event-surface";
                const startStr = ev.start.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
                const endStr = ev.end.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
                const titleEl = document.createElement("div");
                titleEl.className = "event-title";
                titleEl.textContent = ev.isUntitled ? this.t("noTitle") : ev.title;

                const timeEl = document.createElement("div");
                timeEl.className = "event-time";
                timeEl.textContent = `${startStr} – ${endStr}`;

                eventSurface.appendChild(titleEl);
                eventSurface.appendChild(timeEl);
                eventDiv.appendChild(eventSurface);

                eventDiv.addEventListener("click", () => this.showEventDialog(ev));

                timedContainer.appendChild(eventDiv);
            }
        }

        this.buildTimeLabels();
        this.updateTimeLine();
    }

    updateTimeMetrics() {
        const fallbackViewport = Math.max(this.clientHeight || 0, this.grid?.clientHeight || 0, 480);
        const firstViewport = this.dayColumns?.[0]?.querySelector(".timed-viewport");
        let viewportHeight = firstViewport?.clientHeight || firstViewport?.offsetHeight || 0;

        if (!viewportHeight && this.grid) {
            const rect = this.grid.getBoundingClientRect();
            if (rect?.height) {
                viewportHeight = rect.height;
            }
        }

        if (!viewportHeight && typeof this.getBoundingClientRect === "function") {
            const hostRect = this.getBoundingClientRect();
            if (hostRect?.height) {
                const headerRect = this.shadowRoot.querySelector(".header-bar")?.getBoundingClientRect();
                const headerHeight = headerRect?.height || 0;
                viewportHeight = Math.max(hostRect.height - headerHeight, 0);
            }
        }

        if (!viewportHeight) {
            viewportHeight = fallbackViewport;
        }

        this.timeViewportHeight = viewportHeight;
        const effectiveHeight = Math.max(viewportHeight, 24);
        this.pixelsPerMinute = effectiveHeight / (24 * 60);
        this.timeAxisOffset = this.columnPaddingTop;
    }


    resolveColorValue(color) {
        if (color === undefined || color === null) {
            return null;
        }
        if (typeof color === "number" && Number.isFinite(color)) {
            const hex = `#${Math.round(color).toString(16).padStart(6, "0")}`;
            return hex;
        }
        if (typeof color !== "string") {
            return null;
        }

        const trimmed = color.trim();
        if (!trimmed) {
            return null;
        }

        if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed) || trimmed.startsWith("rgb")) {
            return trimmed;
        }

        if (!this.colorResolver) {
            return trimmed;
        }

        this.colorResolver.style.backgroundColor = trimmed;
        const computed = getComputedStyle(this.colorResolver).backgroundColor;
        this.colorResolver.style.backgroundColor = "";
        if (computed && computed !== "rgba(0, 0, 0, 0)") {
            return computed;
        }

        return trimmed;
    }

    getRGB(color) {
        const resolved = this.resolveColorValue(color);
        if (!resolved) {
            return null;
        }

        const hexMatch = resolved.match(/^#([0-9a-fA-F]{3,8})$/);
        if (hexMatch) {
            let hex = hexMatch[1];
            if (hex.length === 3) {
                hex = hex.split("").map(ch => ch + ch).join("");
            } else if (hex.length === 4) {
                hex = hex.split("").map(ch => ch + ch).join("");
            }
            if (hex.length >= 6) {
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                return { r, g, b };
            }
        }

        const rgbMatch = resolved.match(/rgba?\(([^)]+)\)/);
        if (rgbMatch) {
            const parts = rgbMatch[1].split(",").map(p => p.trim()).slice(0, 3);
            if (parts.length === 3) {
                const values = parts.map(part => {
                    if (part.endsWith("%")) {
                        const percent = parseFloat(part);
                        return Math.max(0, Math.min(255, (Number.isFinite(percent) ? percent : 0) * 2.55));
                    }
                    const numeric = parseFloat(part);
                    return Math.max(0, Math.min(255, Number.isFinite(numeric) ? numeric : 0));
                });
                const [r, g, b] = values;
                if ([r, g, b].every(v => Number.isFinite(v))) {
                    return { r, g, b };
                }
            }
        }

        return null;
    }

    rgbToString({ r, g, b }) {
        const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
        return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`;
    }

    rgbToHex({ r, g, b }) {
        const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
        const toHex = v => clamp(v).toString(16).padStart(2, "0");
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    getHexColor(color, fallback = "#4287f5") {
        const rgb = this.getRGB(color);
        if (rgb) {
            return this.rgbToHex(rgb);
        }

        const fallbackRgb = this.getRGB(fallback);
        if (fallbackRgb) {
            return this.rgbToHex(fallbackRgb);
        }

        return "#4287f5";
    }

    mixColor(colorA, colorB, weight = 0.5) {
        const rgbA = this.getRGB(colorA);
        const rgbB = this.getRGB(colorB);
        if (!rgbA && !rgbB) {
            return null;
        }
        if (!rgbA) {
            return this.rgbToString(rgbB);
        }
        if (!rgbB) {
            return this.rgbToString(rgbA);
        }

        const w = Math.max(0, Math.min(1, Number(weight)));
        const r = rgbA.r * (1 - w) + rgbB.r * w;
        const g = rgbA.g * (1 - w) + rgbB.g * w;
        const b = rgbA.b * (1 - w) + rgbB.b * w;
        return this.rgbToString({ r, g, b });
    }

    getReadableTextColor(color, fallback = "#ffffff") {
        const rgb = this.getRGB(color);
        if (!rgb) {
            return fallback;
        }

        const luminance = this.getRelativeLuminance(rgb);
        return luminance > 0.57 ? "#1f1f1f" : "#ffffff";
    }

    getRelativeLuminance({ r, g, b }) {
        const toLinear = value => {
            const channel = value / 255;
            return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
        };

        const rLin = toLinear(r);
        const gLin = toLinear(g);
        const bLin = toLinear(b);

        return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
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

    

    updateTimeLine() {
        this.grid.querySelectorAll(".time-line").forEach(el => el.remove());
        const now = new Date();
        const [start, end] = this.getWeekRange();
        if (now < start || now > end) return;

        const todayOffset = (now.getDay() + 6) % 7;
        if (!this.dayColumns[todayOffset]) return;

        const minutes = now.getHours() * 60 + now.getMinutes();
        const line = document.createElement("div");
        line.className = "time-line";
        line.style.top = `${this.timeAxisOffset + minutes * this.pixelsPerMinute}px`;
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

        const languageRow = document.createElement("div");
        Object.assign(languageRow.style, {
            display: "flex",
            alignItems: "center",
            gap: "12px"
        });

        const languageLabel = document.createElement("label");
        Object.assign(languageLabel.style, {
            flex: "1",
            fontWeight: "600",
            color: "#333"
        });

        const languageSelect = document.createElement("select");
        Object.assign(languageSelect.style, {
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid var(--divider-color, #ccc)",
            fontSize: "0.95em",
            cursor: "pointer",
            background: "var(--card-background-color, #fff)",
            color: "var(--primary-text-color, #111)"
        });

        const systemOption = document.createElement("option");
        systemOption.value = "system";
        languageSelect.appendChild(systemOption);

        Object.entries(CALENDAR_WEEK_CARD_LANGUAGE_NAMES).forEach(([code, name]) => {
            const option = document.createElement("option");
            option.value = code;
            option.textContent = name;
            languageSelect.appendChild(option);
        });

        const languageSelectId = `calendar-week-card-language-${Math.random().toString(36).slice(2, 8)}`;
        languageSelect.id = languageSelectId;
        languageLabel.setAttribute("for", languageSelectId);

        languageSelect.value = this.languagePreference;

        languageRow.appendChild(languageLabel);
        languageRow.appendChild(languageSelect);
        content.appendChild(languageRow);

        const title = document.createElement("h3");
        Object.assign(title.style, { margin: 0, fontSize: "1.3em", color: "#333" });
        content.appendChild(title);

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
            picker.value = this.getHexColor(this.config.colors[entity]);
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
        donateImage.style.border = "0";

        donateLink.appendChild(donateImage);
        donateSection.appendChild(donateLink);
        content.appendChild(donateSection);

        const closeBtn = document.createElement("button");
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

        const updateDialogText = () => {
            title.textContent = this.t("calendarColors");
            const languageLabelText = this.t("languageLabel");
            languageLabel.textContent = languageLabelText;
            systemOption.textContent = this.t("systemDefault");
            languageSelect.setAttribute("aria-label", languageLabelText);
            languageSelect.setAttribute("title", languageLabelText);
            supportText.textContent = this.t("supportViaPaypal");
            donateImage.alt = this.t("donateWithPaypal");
            closeBtn.textContent = this.t("saveAndClose");
        };

        languageSelect.addEventListener("change", e => {
            this.setLanguagePreference(e.target.value);
            languageSelect.value = this.languagePreference;
            updateDialogText();
        });

        updateDialogText();

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
        const eventTitle = ev.isUntitled ? this.t("noTitle") : ev.title;
        title.textContent = eventTitle;
        Object.assign(title.style, { margin: 0, fontSize: "1.3em", color: "#333" });
        content.appendChild(title);

        const locale = this.getLocale();
        const startDate = ev.start.toLocaleString(locale, {weekday: "long", year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit"});
        const endDate = ev.end.toLocaleString(locale, {weekday: "long", year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit"});

        const details = document.createElement("div");
        details.innerHTML = `
        <p style="margin:0; color:#555;"><b>${this.t("calendar")}:</b> ${this.getCalendarName(ev.calendar)}</p>
        <p style="margin:0; color:#555;"><b>${this.t("start")}:</b> ${startDate}</p>
        <p style="margin:0; color:#555;"><b>${this.t("end")}:</b> ${endDate}</p>
    `;
        content.appendChild(details);

        const closeBtn = document.createElement("button");
        closeBtn.textContent = this.t("close");
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