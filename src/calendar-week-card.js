import {
    FALLBACK_LANGUAGE,
    LANGUAGE_NAMES,
    SUPPORTED_LANGUAGES,
    getSupportedLanguageForHass,
    normalizeLanguage,
    resolveLanguage,
    translate
} from "./localization.js";
import {
    getHexColor,
    getReadableTextColor,
    getRelativeLuminance,
    mixColors,
    parseRGB,
    resolveColorValue,
    rgbToHex,
    rgbToString
} from "./colors.js";
import {
    CARD_DOCUMENTATION_URL,
    HOME_ASSISTANT_INTEGRATIONS_URL,
    buildNoCalendarsCopy,
    createNoCalendarsLayout
} from "./no-calendars.js";
import { createCardTemplate } from "./styles.js";
import { applyThemeVariables as applyThemeVariablesToElement } from "./theme.js";
import "./calendar-week-card-picker.js";

export class CalendarWeekCard extends HTMLElement {
    constructor() {
        super();
        this.weekOffset = 0;
        this.lastEvents = [];
        this.dynamicEntities = [];
        this.availableCalendars = [];
        this._stateCalendarsSnapshot = [];
        this._hasAppliedCalendars = false;
        this.configHiddenKey = "calendar-week-card-hidden";
        this.pixelsPerMinute = 1;
        this.timeAxisOffset = 0;
        this.timeViewportHeight = 24 * 60;
        this.columnPaddingTop = 0;
        this.columnPaddingBottom = 0;
        this.allDayRowHeight = 22;
        this.allDayRowOverlap = 4;
        this.visibleStartMinute = 0;
        this.visibleEndMinute = 24 * 60;
        this.trimUnusedHoursKey = "calendar-week-card-trim-hours";
        this.languagePreference = "system";
        this.language = "en";
        this.themePreference = "system";
        this.theme = "light";
        this._systemThemeMedia = null;
        this._systemThemeListener = null;
        this.baseColors = {};
        this.baseHiddenEntities = [];
        this._configOverrides = {};
        this.inlineNoCalendarsContainer = null;
        this._isEditorPreview = false;
        this._refreshCalendarsPromise = undefined;
    }
    resolveLanguage(preference) {
        return resolveLanguage(preference, {
            fallback: FALLBACK_LANGUAGE,
            supported: SUPPORTED_LANGUAGES
        });
    }

    getLocale() {
        return this.language || "en";
    }

    t(key) {
        const locale = this.getLocale();
        return translate(locale, key);
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
        const supported = SUPPORTED_LANGUAGES;
        if (preference !== "system") {
            const normalizedPreference = normalizeLanguage(preference);
            this.languagePreference = supported.includes(normalizedPreference) ? normalizedPreference : "system";
        } else {
            this.languagePreference = "system";
        }

        this.language = this.resolveLanguage(this.languagePreference);
        this.config.language = this.languagePreference;
        localStorage.setItem("calendar-week-card-language", this.languagePreference);

        this.refreshDisplay();
        if (this.inlineNoCalendarsContainer && !this.inlineNoCalendarsContainer.hidden) {
            this.renderInlineNoCalendarsContent();
        }
    }

    resolveTheme(preference) {
        if (preference === "dark" || preference === "light") {
            return preference;
        }

        if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
            const query = window.matchMedia("(prefers-color-scheme: dark)");
            return query.matches ? "dark" : "light";
        }

        return "light";
    }

    readCssColor(variable, fallback) {
        if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") {
            return fallback;
        }

        try {
            const target = this.isConnected ? this : document.documentElement;
            const computed = window.getComputedStyle(target);
            const value = computed.getPropertyValue(variable);
            return value ? value.trim() || fallback : fallback;
        } catch (err) {
            return fallback;
        }
    }

    parseAllDayDate(dateString) {
        if (!dateString || typeof dateString !== "string") {
            return new Date(dateString || Date.now());
        }

        const parts = dateString.split("-").map(Number);
        if (parts.length === 3 && parts.every(num => Number.isFinite(num))) {
            const [year, month, day] = parts;
            return new Date(year, month - 1, day);
        }

        return new Date(dateString);
    }

    initializeThemePreference() {
        let storedThemePreference = null;
        try {
            storedThemePreference = localStorage.getItem("calendar-week-card-theme");
        } catch (err) {
            storedThemePreference = null;
        }
        const hasThemeOverride = this._configOverrides?.theme === true;
        const configTheme = typeof this.config?.theme === "string" ? this.config.theme : null;
        let initialThemePreference = "system";
        if (hasThemeOverride && configTheme) {
            initialThemePreference = configTheme;
        } else if (storedThemePreference) {
            initialThemePreference = storedThemePreference;
        } else if (configTheme) {
            initialThemePreference = configTheme;
        }
        const validThemes = ["light", "dark", "system"];
        this.themePreference = validThemes.includes(initialThemePreference) ? initialThemePreference : "system";
        this.config.theme = this.themePreference;
        this.theme = this.resolveTheme(this.themePreference);
    }

    updateThemePreference(preference, { persist = true, refresh = true } = {}) {
        const valid = ["light", "dark", "system"];
        const normalized = valid.includes(preference) ? preference : "system";
        this.themePreference = normalized;
        this.config.theme = normalized;

        if (persist) {
            try {
                localStorage.setItem("calendar-week-card-theme", normalized);
            } catch (err) {
                // Ignore persistence errors
            }
        }

        this.updateSystemThemeListener();
        this.applyTheme({ refresh });
    }

    setThemePreference(preference) {
        this.updateThemePreference(preference, { persist: true, refresh: true });
    }

    applyTheme({ refresh = true } = {}) {
        const theme = this.resolveTheme(this.themePreference);
        this.theme = theme;
        this.classList.toggle("theme-dark", theme === "dark");
        this.classList.toggle("theme-light", theme !== "dark");

        this.applyThemeVariables(theme);

        if (!this.shadowRoot || !refresh) {
            return;
        }

        this.refreshDisplay();
    }

    applyThemeVariables(theme) {
        applyThemeVariablesToElement(this, theme, this.readCssColor.bind(this));
    }

    updateSystemThemeListener() {
        if (this._systemThemeMedia && this._systemThemeListener) {
            if (typeof this._systemThemeMedia.removeEventListener === "function") {
                this._systemThemeMedia.removeEventListener("change", this._systemThemeListener);
            } else if (typeof this._systemThemeMedia.removeListener === "function") {
                this._systemThemeMedia.removeListener(this._systemThemeListener);
            }
        }

        this._systemThemeMedia = null;
        this._systemThemeListener = null;

        if (this.themePreference !== "system" || typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return;
        }

        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = event => {
            if (this.themePreference === "system") {
                this.theme = event.matches ? "dark" : "light";
                this.applyThemeVariables(this.theme);
                if (this.shadowRoot) {
                    this.classList.toggle("theme-dark", this.theme === "dark");
                    this.classList.toggle("theme-light", this.theme !== "dark");
                    this.refreshDisplay();
                }
            }
        };

        if (typeof media.addEventListener === "function") {
            media.addEventListener("change", handler);
        } else if (typeof media.addListener === "function") {
            media.addListener(handler);
        }

        this._systemThemeMedia = media;
        this._systemThemeListener = handler;
    }

    connectedCallback() {
        this.updateEditorPreviewState();
    }

    disconnectedCallback() {
        if (this._systemThemeMedia && this._systemThemeListener) {
            if (typeof this._systemThemeMedia.removeEventListener === "function") {
                this._systemThemeMedia.removeEventListener("change", this._systemThemeListener);
            } else if (typeof this._systemThemeMedia.removeListener === "function") {
                this._systemThemeMedia.removeListener(this._systemThemeListener);
            }
        }
        this._systemThemeMedia = null;
        this._systemThemeListener = null;
        this._isEditorPreview = false;
    }

    updateEditorPreviewState() {
        if (typeof this.closest !== "function") {
            this._isEditorPreview = false;
            return;
        }
        this._isEditorPreview = !!this.closest("hui-card-preview");
    }

    isEditorPreview() {
        return !!this._isEditorPreview;
    }

    refreshDisplay() {
        if (!this.shadowRoot) {
            return;
        }

        this.applyTranslations();
        this.updateHeader();

        if (this.dayColumns?.length) {
            const events = Array.isArray(this.lastEvents) ? [...this.lastEvents] : [];
            this.renderList(events);
        } else {
            this.buildTimeLabels();
            this.updateTimeLine();
        }
    }

    getDialogPalette() {
        const styles = this.shadowRoot ? getComputedStyle(this) : null;
        const read = (prop, fallback) => {
            if (!styles) return fallback;
            const value = styles.getPropertyValue(prop);
            return value ? value.trim() : fallback;
        };

        const isDark = this.theme === "dark";

        return {
            overlay: read("--cwc-overlay", isDark ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.5)"),
            background: read("--cwc-dialog-background", isDark ? "#1b1f2a" : "#ffffff"),
            text: read("--cwc-dialog-text", isDark ? "#e3e8ff" : "#333333"),
            muted: read("--cwc-dialog-muted", isDark ? "#b0b6c9" : "#555555"),
            border: read("--cwc-dialog-divider", isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"),
            inputBackground: isDark ? "#232735" : "#ffffff"
        };
    }

    getAccentColors() {
        return {
            primary: this.readCssColor("--primary-color", "#4D96FF"),
            secondary: this.readCssColor("--secondary-color", "#6BCB77")
        };
    }

    applyDialogButtonStyles(button) {
        if (!button) {
            return;
        }

        const gradientMeta = button.__cwcButtonGradient || {};
        const accent = this.getAccentColors();
        const usesDefault = gradientMeta.usesDefaultGradient !== false && !gradientMeta.startColor && !gradientMeta.endColor;
        const gradientStart = usesDefault ? accent.primary : (gradientMeta.startColor || accent.primary);
        const gradientEnd = usesDefault ? accent.secondary : (gradientMeta.endColor || accent.secondary);
        const textColor = gradientMeta.textColor || "#ffffff";

        button.style.background = `linear-gradient(120deg, ${gradientStart}, ${gradientEnd})`;
        button.style.color = textColor;
    }

    getNoCalendarsContent() {
        return buildNoCalendarsCopy(key => this.t(key));
    }

    getNoCalendarsHandlers() {
        return {
            onOpenIntegrations: () => {
                if (typeof window !== "undefined") {
                    window.open(HOME_ASSISTANT_INTEGRATIONS_URL, "_blank", "noopener,noreferrer");
                }
            },
            onReadGuide: () => {
                if (typeof window !== "undefined") {
                    window.open(CARD_DOCUMENTATION_URL, "_blank", "noopener,noreferrer");
                }
            },
            onRefresh: () => {
                if (this._hass) {
                    this.ensureEntities(this._hass).then(() => this.loadEvents(this._hass));
                }
            }
        };
    }

    createInlineNoCalendarsContent() {
        const copy = this.getNoCalendarsContent();
        return createNoCalendarsLayout(copy, {
            handlers: this.getNoCalendarsHandlers(),
            buttonFactory: (label, handler) => this.createDialogButton(label, { onClick: handler })
        });
    }

    renderInlineNoCalendarsContent() {
        if (!this.inlineNoCalendarsContainer) {
            return;
        }
        this.inlineNoCalendarsContainer.innerHTML = "";
        const layout = this.createInlineNoCalendarsContent();
        if (layout) {
            this.inlineNoCalendarsContainer.appendChild(layout);
        }
    }

    showInlineNoCalendarsState() {
        if (!this.inlineNoCalendarsContainer) {
            return;
        }
        this.renderInlineNoCalendarsContent();
        this.inlineNoCalendarsContainer.hidden = false;
        if (this.weekBody) {
            this.weekBody.style.display = "none";
        }
        if (this.header) {
            this.header.style.display = "none";
        }
    }

    hideInlineNoCalendarsState() {
        if (this.inlineNoCalendarsContainer) {
            this.inlineNoCalendarsContainer.hidden = true;
            this.inlineNoCalendarsContainer.innerHTML = "";
        }
        if (this.weekBody) {
            this.weekBody.style.display = "";
        }
        if (this.header) {
            this.header.style.display = "";
        }
    }

    presentNoCalendarsState() {
        if (this.isEditorPreview()) {
            this.hideInlineNoCalendarsState();
            return;
        }
        this.showInlineNoCalendarsState();
    }

    createDialogButton(label, options = {}) {
        const {
            startColor = null,
            endColor = null,
            textColor = "#ffffff",
            onClick = null
        } = options;

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;

        button.__cwcButtonGradient = {
            usesDefaultGradient: !startColor && !endColor,
            startColor,
            endColor,
            textColor
        };

        Object.assign(button.style, {
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "1em",
            padding: "10px 18px",
            transition: "transform 0.15s ease, box-shadow 0.25s ease, filter 0.2s ease",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            textDecoration: "none",
            minHeight: "40px",
            textShadow: "1px 1px rgba(0,0,0, 0.5)"

        });

        this.applyDialogButtonStyles(button);

        const elevate = () => {
            button.style.boxShadow = "0 6px 16px rgba(0,0,0,0.25)";
            button.style.transform = "translateY(-1px)";
        };
        const reset = () => {
            button.style.boxShadow = "none";
            button.style.transform = "translateY(0)";
        };

        button.addEventListener("mouseenter", elevate);
        button.addEventListener("mouseleave", reset);
        button.addEventListener("focus", elevate);
        button.addEventListener("blur", reset);

        if (typeof onClick === "function") {
            button.addEventListener("click", onClick);
        }

        return button;
    }

    clearStoredData() {
        const storageKeys = [
            "calendar-week-card-colors",
            "calendar-week-card-language",
            this.configHiddenKey,
            "calendar-week-card-today-highlight-color",
            "calendar-week-card-highlight-enabled",
            this.trimUnusedHoursKey,
            "calendar-week-card-theme"
        ];

        storageKeys.forEach(key => {
            try {
                localStorage.removeItem(key);
            } catch (err) {
                console.warn("calendar-week-card: Failed to remove stored key", key, err);
            }
        });

        this.config.colors = { ...this.baseColors };
        this.config.hidden_entities = Array.isArray(this.baseHiddenEntities) ? [...this.baseHiddenEntities] : [];
        this.languagePreference = "system";
        this.language = this.resolveLanguage(this.languagePreference);
        this.config.language = this.languagePreference;
        this.themePreference = "system";
        this.theme = this.resolveTheme(this.themePreference);
        this.config.theme = this.themePreference;
        this.config.today_highlight_color = "#4D96FF";
        this.config.highlight_today = true;
        this.config.trim_unused_hours = false;

        this.assignDefaultColors(this.getActiveEntities());

        this.updateSystemThemeListener();
        this.applyTheme({ refresh: false });
        this.refreshDisplay();
    }

    setConfig(config) {
        const rawConfig = config || {};
        const hasOwn = (key) => Object.prototype.hasOwnProperty.call(rawConfig, key);
        this._configOverrides = {
            colors: hasOwn("colors"),
            hidden_entities: hasOwn("hidden_entities"),
            language: hasOwn("language"),
            theme: hasOwn("theme"),
            highlight_today: hasOwn("highlight_today"),
            today_highlight_color: hasOwn("today_highlight_color"),
            trim_unused_hours: hasOwn("trim_unused_hours")
        };

        this.config = structuredClone(rawConfig) || {};
        this.config.colors = this.config.colors && typeof this.config.colors === "object" ? this.config.colors : {};
        this.config.hidden_entities = Array.isArray(this.config.hidden_entities) ? this.config.hidden_entities : [];

        let storedLanguagePreference = null;
        try {
            storedLanguagePreference = localStorage.getItem("calendar-week-card-language");
        } catch (err) {
            storedLanguagePreference = null;
        }
        const configLanguage = typeof this.config.language === "string" ? this.config.language : null;
        const hasLanguageOverride = this._configOverrides.language && configLanguage;
        const languagePreferenceCandidate = hasLanguageOverride
            ? configLanguage
            : (configLanguage || storedLanguagePreference || "system");
        this.languagePreference = languagePreferenceCandidate || "system";
        if (this.languagePreference !== "system") {
            const normalized = normalizeLanguage(this.languagePreference);
            this.languagePreference = SUPPORTED_LANGUAGES.includes(normalized) ? normalized : "system";
        }
        this.language = this.resolveLanguage(this.languagePreference);
        this.config.language = this.languagePreference;
        this.baseColors = { ...this.config.colors };
        this.baseHiddenEntities = Array.isArray(this.config.hidden_entities) ? [...this.config.hidden_entities] : [];
        this.dynamicEntities = [];
        this.availableCalendars = [];
        this._stateCalendarsSnapshot = [];
        this._entitiesPromise = undefined;
        this._refreshCalendarsPromise = undefined;

        this.initializeThemePreference();

        // Load saved colors
        let savedColors = null;
        try {
            savedColors = localStorage.getItem("calendar-week-card-colors");
        } catch (err) {
            savedColors = null;
        }
        if (savedColors) {
            try {
                const parsedColors = JSON.parse(savedColors);
                if (parsedColors && typeof parsedColors === "object") {
                    this.config.colors = { ...parsedColors, ...this.config.colors };
                }
            } catch (err) {
                console.warn("calendar-week-card: Failed to parse saved colors", err);
            }
        }

        const savedHidden = localStorage.getItem(this.configHiddenKey);
        if (savedHidden && !this._configOverrides.hidden_entities) {
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

        let savedHighlightColor = null;
        try {
            savedHighlightColor = localStorage.getItem("calendar-week-card-today-highlight-color");
        } catch (err) {
            savedHighlightColor = null;
        }
        const hasHighlightColorOverride = this._configOverrides.today_highlight_color;
        if (hasHighlightColorOverride && typeof this.config.today_highlight_color === "string") {
            this.config.today_highlight_color = getHexColor(this.config.today_highlight_color, "#4D96FF");
        } else if (savedHighlightColor) {
            this.config.today_highlight_color = getHexColor(savedHighlightColor, this.config.today_highlight_color || "#4D96FF");
        } else if (typeof this.config.today_highlight_color === "string") {
            this.config.today_highlight_color = getHexColor(this.config.today_highlight_color, "#4D96FF");
        } else {
            this.config.today_highlight_color = "#4D96FF";
        }

        let savedHighlightEnabled = null;
        try {
            savedHighlightEnabled = localStorage.getItem("calendar-week-card-highlight-enabled");
        } catch (err) {
            savedHighlightEnabled = null;
        }
        const hasHighlightOverride = this._configOverrides.highlight_today;
        if (hasHighlightOverride) {
            if (typeof this.config.highlight_today === "string") {
                this.config.highlight_today = this.config.highlight_today !== "false";
            } else {
                this.config.highlight_today = this.config.highlight_today !== false;
            }
        } else if (savedHighlightEnabled !== null) {
            this.config.highlight_today = savedHighlightEnabled !== "false";
        } else if (typeof this.config.highlight_today === "string") {
            this.config.highlight_today = this.config.highlight_today !== "false";
        } else if (typeof this.config.highlight_today !== "boolean") {
            this.config.highlight_today = true;
        }

        let savedTrimUnused = null;
        try {
            savedTrimUnused = localStorage.getItem(this.trimUnusedHoursKey);
        } catch (err) {
            savedTrimUnused = null;
        }
        const hasTrimOverride = this._configOverrides.trim_unused_hours;
        if (hasTrimOverride) {
            if (typeof this.config.trim_unused_hours === "string") {
                this.config.trim_unused_hours = this.config.trim_unused_hours !== "false";
            } else {
                this.config.trim_unused_hours = this.config.trim_unused_hours === true;
            }
        } else if (savedTrimUnused !== null) {
            this.config.trim_unused_hours = savedTrimUnused !== "false";
        } else if (typeof this.config.trim_unused_hours === "string") {
            this.config.trim_unused_hours = this.config.trim_unused_hours !== "false";
        } else if (typeof this.config.trim_unused_hours !== "boolean") {
            this.config.trim_unused_hours = false;
        }

        this.attachShadow({mode: "open"});

        this.shadowRoot.innerHTML = createCardTemplate();

        this.grid = this.shadowRoot.querySelector(".week-grid");
        this.timeBar = this.shadowRoot.querySelector(".time-bar");
        this.header = this.shadowRoot.querySelector(".week-header");
        this.titleLine = this.shadowRoot.querySelector(".title-line");
        this.dayColumns = this.shadowRoot.querySelectorAll(".day-column");
        this.weekBody = this.shadowRoot.querySelector(".week-body");
        this.inlineNoCalendarsContainer = this.shadowRoot.querySelector(".no-calendars-inline");

        this.colorResolver = document.createElement("div");
        this.colorResolver.style.display = "none";
        this.shadowRoot.appendChild(this.colorResolver);

        this.applyTheme({ refresh: false });
        this.updateSystemThemeListener();

        this.shadowRoot.querySelector(".prev-week").addEventListener("click", () => this.changeWeek(-1));
        this.shadowRoot.querySelector(".next-week").addEventListener("click", () => this.changeWeek(1));
        this.shadowRoot.querySelector(".today").addEventListener("click", () => this.resetToCurrentWeek());
        this.shadowRoot.querySelector(".settings-icon").addEventListener("click", () => this.showSettingsDialog());

        this.refreshDisplay();
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
        sunday.setHours(23, 59, 59, 999);
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
        const visibleStart = this.visibleStartMinute || 0;
        const visibleEnd = this.visibleEndMinute || 24 * 60;
        let startHour = Math.max(1, Math.ceil(visibleStart / 60));
        let endHour = Math.min(23, Math.floor((visibleEnd - 1) / 60));

        if (startHour > endHour) {
            startHour = Math.max(1, Math.floor(visibleStart / 60));
            endHour = Math.min(23, Math.ceil(visibleEnd / 60));
        }

        for (let h = startHour; h <= endHour; h++) {
            const label = document.createElement("div");
            label.className = "hour-label";
            label.textContent = `${h.toString().padStart(2, '0')}:00`;
            label.style.top = `${this.timeAxisOffset + h * 60 * this.pixelsPerMinute}px`;
            this.timeBar.appendChild(label);
        }

        this.updateTimeLine();
    }

    set hass(hass) {
        this._hass = hass;
        this.updateEditorPreviewState();
        this.updateCalendarsFromStates(hass);
        this.loadEvents(hass);
    }

    async loadEvents(hass) {
        await this.ensureEntities(hass);

        const visibleEntities = this.getVisibleEntityIds(hass);

        if (!visibleEntities.length) {
            if (this.isEditorPreview()) {
                this.hideInlineNoCalendarsState();
                this.renderList(this.buildPreviewExampleEvents());
            } else {
                this.presentNoCalendarsState();
                this.renderList([]);
            }
            return;
        }

        const [start, end] = this.getWeekRange();
        let allEvents = [];
        const unavailableCalendars = new Set();
        let refreshedAfterUnavailable = false;

        for (const entity of visibleEntities) {
            try {
                const url = `calendars/${entity}?start=${start.toISOString()}&end=${end.toISOString()}`;
                const events = await hass.callApi("get", url);
                events.forEach(ev => {
                    const startIsDateOnly = !!ev.start?.date && !ev.start?.dateTime;
                    const endIsDateOnly = !!ev.end?.date && !ev.end?.dateTime;
                    const startDate = startIsDateOnly
                        ? this.parseAllDayDate(ev.start.date)
                        : new Date(ev.start.dateTime || ev.start.date);
                    const endDate = endIsDateOnly
                        ? this.parseAllDayDate(ev.end.date)
                        : new Date(ev.end.dateTime || ev.end.date);
                    let isAllDay = startIsDateOnly || endIsDateOnly;

                    if (!isAllDay && ev.start?.dateTime && ev.end?.dateTime) {
                        const durationMinutes = (endDate - startDate) / (1000 * 60);
                        if (durationMinutes >= 24 * 60 && startDate.getHours() === 0 && startDate.getMinutes() === 0 && endDate.getHours() === 0 && endDate.getMinutes() === 0) {
                            isAllDay = true;
                        }
                    }

                    const hasSummary = typeof ev.summary === "string" && ev.summary.trim().length > 0;
                    const location = typeof ev.location === "string" ? ev.location.trim() : "";
                    const description = typeof ev.description === "string" ? ev.description.trim() : "";
                    allEvents.push({
                        calendar: entity,
                        title: hasSummary ? ev.summary : "",
                        isUntitled: !hasSummary,
                        start: startDate,
                        end: endDate,
                        color: ev.color,
                        isAllDay,
                        location,
                        description
                    });
                });
            } catch (e) {
                console.error("Error fetching events:", entity, e);
                if (this.isCalendarUnavailableError(e)) {
                    unavailableCalendars.add(entity);
                    if (!refreshedAfterUnavailable) {
                        refreshedAfterUnavailable = true;
                        await this.refreshCalendarsFromApi(hass, { fallbackToStatesOnError: false });
                        const refreshedVisible = this.getVisibleEntityIds(hass);
                        if (!refreshedVisible.length) {
                            this.presentNoCalendarsState();
                            this.renderList([]);
                            return;
                        }

                        const currentSet = new Set(visibleEntities);
                        const listsDiffer =
                            refreshedVisible.length !== visibleEntities.length ||
                            refreshedVisible.some(id => !currentSet.has(id));

                        if (listsDiffer) {
                            await this.loadEvents(hass);
                            return;
                        }
                    }
                }
            }
        }

        if (allEvents.length === 0 && unavailableCalendars.size === visibleEntities.length && visibleEntities.length > 0) {
            await this.refreshCalendarsFromApi(hass, { fallbackToStatesOnError: false });
            this.presentNoCalendarsState();
            this.renderList([]);
            return;
        }

        this.hideInlineNoCalendarsState();
        allEvents.sort((a, b) => a.start - b.start);
        this.renderList(allEvents);
    }

    parseErrorStatusCode(error) {
        if (!error) {
            return null;
        }

        const candidates = [
            error?.status,
            error?.code,
            error?.body?.code,
            error?.body?.status
        ];

        for (const candidate of candidates) {
            if (typeof candidate === "number" && !Number.isNaN(candidate)) {
                return candidate;
            }
            if (typeof candidate === "string") {
                const direct = Number(candidate);
                if (!Number.isNaN(direct)) {
                    return direct;
                }
                const match = candidate.match(/\b(\d{3})\b/);
                if (match) {
                    const parsed = Number(match[1]);
                    if (!Number.isNaN(parsed)) {
                        return parsed;
                    }
                }
            }
        }

        return null;
    }

    isCalendarUnavailableError(error) {
        if (!error) {
            return false;
        }

        const status = this.parseErrorStatusCode(error);
        if (status === 400 || status === 404) {
            return true;
        }

        const code = typeof error?.code === "string" ? error.code.toLowerCase() : "";
        if (code === "not_found" || code === "404") {
            return true;
        }

        const messageSources = [
            error?.message,
            error?.error,
            typeof error?.body === "string" ? error.body : error?.body?.message
        ];

        return messageSources.some(msg =>
            typeof msg === "string" && /not found|no calendar|unable to find|bad request/.test(msg.toLowerCase())
        );
    }

    buildPreviewExampleEvents() {
        const [startOfWeek] = this.getWeekRange();
        if (!startOfWeek) {
            return [];
        }

        const base = new Date(startOfWeek);
        const toDate = (dayOffset, hours, minutes) => {
            const date = new Date(base);
            date.setDate(base.getDate() + dayOffset);
            date.setHours(hours, minutes, 0, 0);
            return date;
        };

        const templates = [
            {
                title: "Team Sync",
                calendar: "calendar.preview_work",
                dayOffset: 0,
                start: { h: 9, m: 0 },
                end: { h: 10, m: 30 },
                color: "#4D96FF",
                location: "Conference Room",
                description: "Quarterly planning and open questions."
            },
            {
                title: "School Holidays",
                calendar: "calendar.preview_family",
                dayOffset: 1,
                isAllDay: true,
                color: "#F6C343",
                description: "All-day break for the kids."
            },
            {
                title: "Client Presentation",
                calendar: "calendar.preview_work",
                dayOffset: 2,
                start: { h: 13, m: 0 },
                end: { h: 14, m: 0 },
                color: "#9B51E0",
                location: "Downtown Office",
                description: "Show the latest roadmap and collect feedback."
            },
            {
                title: "Date Night",
                calendar: "calendar.preview_personal",
                dayOffset: 4,
                start: { h: 19, m: 0 },
                end: { h: 21, m: 30 },
                color: "#EB5757",
                location: "Favorite Restaurant",
                description: "Dinner and movie night."
            },
            {
                title: "Long Run",
                calendar: "calendar.preview_personal",
                dayOffset: 5,
                start: { h: 8, m: 0 },
                end: { h: 10, m: 30 },
                color: "#27AE60",
                location: "Riverside Trail",
                description: "Training for the upcoming marathon."
            }
        ];

        return templates.map(template => {
            const isAllDay = template.isAllDay === true;
            const start = isAllDay
                ? toDate(template.dayOffset, 0, 0)
                : toDate(template.dayOffset, template.start.h, template.start.m);
            const end = isAllDay
                ? toDate(template.dayOffset + 1, 0, 0)
                : toDate(template.dayOffset, template.end.h, template.end.m);
            return {
                title: template.title,
                calendar: template.calendar,
                start,
                end,
                isAllDay,
                color: template.color,
                location: template.location,
                description: template.description
            };
        });
    }
    renderList(events) {
        if (this._hass) {
            this.refreshCalendarsFromApi(this._hass, { fallbackToStatesOnError: false })
        }
        this.lastEvents = events;
        this.dayColumns.forEach(col => {
            col.classList.remove("today-column");
            col.style.removeProperty("--calendar-week-card-today-overlay");
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

        const dayMillis = 24 * 60 * 60 * 1000;
        const normalizeDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const getEventSpanDays = (ev) => {
            const startDay = normalizeDay(ev.start);
            const endForSpan = new Date(ev.end.getTime() - 1);
            const endDay = normalizeDay(endForSpan);
            const diffDays = Math.floor((endDay - startDay) / dayMillis);
            return Math.max(1, diffDays + 1);
        };
        const buildEventTitle = (ev) => {
            const baseTitle = ev.isUntitled ? this.t("noTitle") : ev.title;
            if (!ev.daySpan || ev.daySpan <= 1) {
                return baseTitle;
            }
            const dayIndex = Math.min(Math.max(ev.dayIndex || 1, 1), ev.daySpan);
            return `${baseTitle} (${dayIndex}/${ev.daySpan})`;
        };
        const formatTimeWithOptionalDate = (date, referenceDay, locale) => {
            const timePart = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
            const isSameDay = date.getFullYear() === referenceDay.getFullYear()
                && date.getMonth() === referenceDay.getMonth()
                && date.getDate() === referenceDay.getDate();
            if (isSameDay) {
                return timePart;
            }
            const datePart = date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
            return `${datePart} ${timePart}`;
        };

        const dayRenderData = [];

        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const dayStart = new Date(startOfWeek.getTime() + dayOffset * 24 * 60 * 60 * 1000);
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
            const overlapsDay = ev => ev.start < dayEnd && ev.end > dayStart;
            const mapToDisplayEvent = ev => {
                const spanDays = getEventSpanDays(ev);
                return {
                    ...ev,
                    daySpan: spanDays,
                    dayIndex: Math.min(Math.max(Math.floor((dayStart - normalizeDay(ev.start)) / dayMillis) + 1, 1), spanDays),
                    displayStart: ev.start > dayStart ? ev.start : new Date(dayStart.getTime()),
                    displayEnd: ev.end < dayEnd ? ev.end : new Date(dayEnd.getTime())
                };
            };

            // Get all events for this day, sorted by start time
            const allDayEvents = visibleEvents
                .filter(ev => ev.isAllDay && overlapsDay(ev))
                .map(mapToDisplayEvent)
                .sort((a, b) => a.displayStart - b.displayStart);

            const dayEvents = visibleEvents
                .filter(ev => !ev.isAllDay && overlapsDay(ev))
                .map(mapToDisplayEvent)
                .sort((a, b) => a.displayStart - b.displayStart);

            const dayColumn = this.dayColumns[dayOffset];
            const timedContainer = dayColumn.querySelector(".timed-events");
            dayRenderData.push({ dayEvents, allDayEvents, timedContainer, dayColumn, dayOffset, dayStart, dayEnd });
        }

        const trimUnusedHours = this.config.trim_unused_hours === true;
        let earliestStart = Infinity;
        let latestEnd = -Infinity;

        if (trimUnusedHours) {
            dayRenderData.forEach(({ dayEvents, dayStart, dayEnd }) => {
                dayEvents.forEach(ev => {
                    const startDate = ev.displayStart || ev.start || dayStart;
                    const endDate = ev.displayEnd || ev.end || dayEnd;
                    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
                    let endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
                    if (endMinutes <= startMinutes) {
                        const durationMinutes = Math.max((endDate - startDate) / (1000 * 60), 1);
                        endMinutes = Math.min(startMinutes + durationMinutes, 24 * 60);
                    }
                    earliestStart = Math.min(earliestStart, startMinutes);
                    latestEnd = Math.max(latestEnd, endMinutes);
                });
            });
        }

        if (trimUnusedHours && Number.isFinite(earliestStart) && Number.isFinite(latestEnd) && latestEnd > earliestStart) {
            const totalMinutes = 24 * 60;
            const earlyUnused = Math.max(earliestStart, 0);
            const lateUnused = Math.max(totalMinutes - latestEnd, 0);
            const keepEarly = Math.max(Math.round(earlyUnused * 0.2), 0);
            const keepLate = Math.max(Math.round(lateUnused * 0.2), 0);
            const visibleStart = Math.max(0, earliestStart - keepEarly);
            const visibleEnd = Math.min(totalMinutes, latestEnd + keepLate);
            this.visibleStartMinute = Math.min(visibleStart, visibleEnd - 1);
            this.visibleEndMinute = Math.max(visibleEnd, this.visibleStartMinute + 1);
        } else {
            this.visibleStartMinute = 0;
            this.visibleEndMinute = 24 * 60;
        }

        this.allDayBandHeight = 0;
        this.updateTimeMetrics();

        const highlightEnabled = this.config.highlight_today !== false;
        const highlightEdgeColor = this.getHexColor(this.config.today_highlight_color || "#4D96FF");
        const isDarkTheme = this.theme === "dark";
        const highlightMix = this.mixColor(highlightEdgeColor, "#ffffff", isDarkTheme ? 0.12 : 0.4) || highlightEdgeColor;
        const highlightOverlay = this.colorWithAlpha(highlightMix, isDarkTheme ? 0.28 : 0.2);
        const now = new Date();
        const todayOffset = (now.getDay() + 6) % 7;
        const shouldHighlightToday = highlightEnabled && this.weekOffset === 0;

        for (const { dayColumn, dayOffset } of dayRenderData) {
            if (shouldHighlightToday && dayOffset === todayOffset) {
                dayColumn.classList.add("today-column");
                dayColumn.style.setProperty("--calendar-week-card-today-overlay", highlightOverlay);
            }
        }

        const allDayOverlap = Math.min(this.allDayRowOverlap, this.allDayRowHeight - 4);
        const allDayRowStep = Math.max(this.allDayRowHeight - allDayOverlap, 4);
        const baseTopOffset = 0;

        const visibleStartMinute = this.visibleStartMinute || 0;

        for (const { dayEvents, allDayEvents, timedContainer, dayStart, dayEnd } of dayRenderData) {
            if (!timedContainer) continue;
            const activeStack = [];
            const referenceDay = normalizeDay(dayStart);

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
                const allDayTextColor = this.getReadableTextColor(gradientStart);
                eventDiv.style.color = allDayTextColor;
                eventDiv.classList.add(allDayTextColor === "#ffffff" ? "event-light-text" : "event-dark-text");

                const eventSurface = document.createElement("div");
                eventSurface.className = "event-surface all-day-surface";

                const titleEl = document.createElement("div");
                titleEl.className = "event-title";
                titleEl.textContent = buildEventTitle(ev);

                const timeEl = document.createElement("div");
                timeEl.className = "event-tag event-all-day-tag";
                const fullAllDay = this.t("allDay");
                const shortAllDay = this.t("allDayShort") || fullAllDay;
                const tinyAllDay = this.t("allDayAbbrev") || shortAllDay;
                timeEl.textContent = fullAllDay;
                timeEl.setAttribute("title", fullAllDay);

                eventSurface.appendChild(titleEl);
                eventSurface.appendChild(timeEl);
                eventDiv.appendChild(eventSurface);

                eventDiv.addEventListener("click", () => this.showEventDialog(ev));
                timedContainer.appendChild(eventDiv);

                const shrinkAllDayTag = () => {
                    if (eventSurface.scrollWidth > eventSurface.clientWidth + 1) {
                        timeEl.textContent = shortAllDay;
                        if (eventSurface.scrollWidth > eventSurface.clientWidth + 1) {
                            timeEl.textContent = tinyAllDay;
                        }
                    }
                };

                if (typeof requestAnimationFrame === "function") {
                    requestAnimationFrame(shrinkAllDayTag);
                } else {
                    setTimeout(shrinkAllDayTag, 0);
                }
            });

            // 1) First pass: assign columns and track max column index
            let maxColumnIndex = -1;
            for (const ev of dayEvents) {
                const evStart = ev.displayStart || ev.start;
                const evEnd = ev.displayEnd || ev.end;

                for (let i = activeStack.length - 1; i >= 0; i--) {
                    if (activeStack[i].__stackEnd <= evStart) activeStack.splice(i, 1);
                }

                let maxCol = -1;
                activeStack.forEach(e => { if (e.column > maxCol) maxCol = e.column; });
                ev.column = maxCol + 1;
                ev.__stackEnd = evEnd;
                activeStack.push(ev);

                if (ev.column > maxColumnIndex) {
                    maxColumnIndex = ev.column;
                }
            }

            const totalColumns = Math.max(maxColumnIndex + 1, 1);
            const containerWidth = timedContainer.clientWidth || timedContainer.offsetWidth || 0;

            // 2) Second pass: actually render with dynamic left indentation
            for (const ev of dayEvents) {
                const startDate = ev.displayStart || ev.start || dayStart;
                const endDate = ev.displayEnd || ev.end || dayEnd;

                const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
                let endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
                if (endMinutes <= startMinutes) {
                    const durationMinutes = Math.max((endDate - startDate) / (1000 * 60), 1);
                    endMinutes = Math.min(startMinutes + durationMinutes, 24 * 60);
                }
                const top = baseTopOffset + (startMinutes - visibleStartMinute) * this.pixelsPerMinute;
                const durationMinutes = Math.max(endMinutes - startMinutes, 1);
                const minHeight = 32 * this.pixelsPerMinute;
                const height = Math.max(durationMinutes * this.pixelsPerMinute, minHeight);

                // --- dynamic indentation logic ---
                let indentPercent = 0;

                if (totalColumns > 1) {
                    if (totalColumns < 4) {
                        // 0%, 15%, 30%, 45%
                        indentPercent = Math.min(ev.column * 15, 45);
                    } else {
                        // share 0–50% equally across columns
                        const step = 50 / (totalColumns - 1);
                        indentPercent = Math.min(ev.column * step, 50);
                    }
                }

                // convert % of day column width to px (with a small base offset)
                let leftIndent = 2;
                if (containerWidth > 0) {
                    leftIndent += (containerWidth * indentPercent) / 100;
                }

                // keep your right indent logic exactly as before
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
                const timedTextColor = this.getReadableTextColor(gradientStart);
                eventDiv.style.color = timedTextColor;
                eventDiv.classList.add(timedTextColor === "#ffffff" ? "event-light-text" : "event-dark-text");

                const locale = this.getLocale();
                const eventSurface = document.createElement("div");
                eventSurface.className = "event-surface";
                const startStr = formatTimeWithOptionalDate(ev.start, referenceDay, locale);
                const endStr = formatTimeWithOptionalDate(ev.end, referenceDay, locale);

                const titleEl = document.createElement("div");
                titleEl.className = "event-title";
                titleEl.textContent = buildEventTitle(ev);

                const timeEl = document.createElement("div");
                timeEl.className = "event-time";
                timeEl.textContent = `${startStr} – ${endStr}`;

                eventSurface.appendChild(titleEl);
                eventSurface.appendChild(timeEl);
                eventDiv.appendChild(eventSurface);

                if (height <= 48) {
                    eventDiv.classList.add("event-compact");
                }

                eventDiv.addEventListener("click", () => this.showEventDialog(ev));
                timedContainer.appendChild(eventDiv);
            }
        }

        this.buildTimeLabels();
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
        const totalMinutes = 24 * 60;
        const visibleStart = Math.max(0, Math.min(Number(this.visibleStartMinute) || 0, totalMinutes - 1));
        const visibleEnd = Math.max(visibleStart + 1, Math.min(Number(this.visibleEndMinute) || totalMinutes, totalMinutes));
        const visibleDuration = Math.max(visibleEnd - visibleStart, 1);
        this.visibleStartMinute = visibleStart;
        this.visibleEndMinute = visibleEnd;
        this.pixelsPerMinute = effectiveHeight / visibleDuration;
        this.timeAxisOffset = this.columnPaddingTop - visibleStart * this.pixelsPerMinute;
    }

    colorWithAlpha(color, alpha = 1) {
        const rgb = this.getRGB(color);
        if (!rgb) {
            return color;
        }

        const clampedAlpha = Math.max(0, Math.min(1, Number(alpha)));
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedAlpha})`;
    }

    resolveColorValue(color) {
        return resolveColorValue(color, this.colorResolver);
    }

    getRGB(color) {
        return parseRGB(color, this.colorResolver);
    }

    rgbToString({ r, g, b }) {
        return rgbToString({ r, g, b });
    }

    rgbToHex({ r, g, b }) {
        return rgbToHex({ r, g, b });
    }

    getHexColor(color, fallback = "#4287f5") {
        return getHexColor(color, fallback, this.colorResolver);
    }

    mixColor(colorA, colorB, weight = 0.5) {
        return mixColors(colorA, colorB, weight, this.colorResolver);
    }

    getReadableTextColor(color, fallback = "#ffffff") {
        return getReadableTextColor(color, fallback, this.colorResolver);
    }

    getRelativeLuminance({ r, g, b }) {
        return getRelativeLuminance({ r, g, b });
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

        this._entitiesPromise = this.refreshCalendarsFromApi(hass, {
            fallbackToStatesOnError: true
        });

        try {
            await this._entitiesPromise;
        } finally {
            this._entitiesPromise = undefined;
        }
    }

    async refreshCalendarsFromApi(hass, options = {}) {
        if (!hass) {
            return [];
        }

        if (this._refreshCalendarsPromise) {
            return this._refreshCalendarsPromise;
        }

        const { fallbackToStatesOnError = false } = options;

        this._refreshCalendarsPromise = (async () => {
            let calendars = [];
            try {
                const apiCalendars = await this.fetchCalendarsFromApi(hass);
                calendars = this.mergeCalendarNames(apiCalendars, hass);
            } catch (err) {
                console.error("calendar-week-card: Failed to refresh calendars", err);
                if (fallbackToStatesOnError) {
                    calendars = this.getCalendarsFromStates(hass);
                } else {
                    calendars = [];
                }
            }

            this.applyAvailableCalendars(calendars);
            return calendars;
        })();

        try {
            return await this._refreshCalendarsPromise;
        } finally {
            this._refreshCalendarsPromise = undefined;
        }
    }

    async fetchCalendarsFromApi(hass) {
        if (!hass) {
            return [];
        }
        const calendars = await hass.callApi("get", "calendars");
        const locale = this.getLocale();
        const list = Array.isArray(calendars) ? calendars : [];
        return list
            .filter(cal => cal?.entity_id)
            .map(cal => ({
                entity_id: cal.entity_id,
                name: cal.name || cal.entity_id
            }))
            .sort((a, b) => (a.name || a.entity_id).localeCompare(b.name || b.entity_id, locale));
    }

    mergeCalendarNames(calendars = [], hass) {
        if (!Array.isArray(calendars) || calendars.length === 0) {
            return [];
        }

        const stateCalendars = this.getCalendarsFromStates(hass);
        if (!stateCalendars.length) {
            return calendars;
        }

        const stateMap = new Map(stateCalendars.map(cal => [cal.entity_id, cal]));
        return calendars.map(cal => {
            const stateMatch = stateMap.get(cal.entity_id);
            if (stateMatch?.name && stateMatch.name !== cal.name) {
                return { ...cal, name: stateMatch.name };
            }
            return cal;
        });
    }

    applyAvailableCalendars(calendars = []) {
        const validCalendars = Array.isArray(calendars)
            ? calendars.filter(cal => cal && cal.entity_id)
            : [];
        this.availableCalendars = validCalendars;
        this._hasAppliedCalendars = true;

        if (!this.config?.entities?.length) {
            this.dynamicEntities = validCalendars.map(cal => cal.entity_id);
            this.assignDefaultColors(this.dynamicEntities);
        }

        let hasEntities = false;
        if (this.config?.entities?.length) {
            const validIds = new Set(validCalendars.map(cal => cal.entity_id));
            hasEntities = this.config.entities.some(entityId => validIds.has(entityId) && !this.isEntityHidden(entityId));
        } else {
            hasEntities = this.dynamicEntities.length > 0;
        }

        if (!hasEntities) {
            this.presentNoCalendarsState();
        } else {
            this.hideInlineNoCalendarsState();
        }
    }

    getActiveEntities() {
        if (this.config?.entities?.length) {
            return this.config.entities;
        }
        return this.dynamicEntities;
    }

    getKnownCalendarIds() {
        if (Array.isArray(this.availableCalendars) && this.availableCalendars.length) {
            return this.availableCalendars.map(cal => cal.entity_id);
        }
        return [];
    }

    getVisibleEntityIds(hass) {
        const entities = Array.isArray(this.getActiveEntities()) ? [...this.getActiveEntities()] : [];
        if (!entities.length) {
            return [];
        }
        const notHidden = entities.filter(entityId => entityId && !this.isEntityHidden(entityId));
        const knownIds = this.getKnownCalendarIds();
        const shouldFilterToKnown = this._hasAppliedCalendars === true;
        if (!shouldFilterToKnown) {
            return notHidden;
        }
        const knownSet = new Set(knownIds);
        return notHidden.filter(entityId => knownSet.has(entityId));
    }

    getHiddenEntities() {
        return Array.isArray(this.config?.hidden_entities) ? this.config.hidden_entities : [];
    }

    isEntityHidden(entityId) {
        return this.getHiddenEntities().includes(entityId);
    }

    getCalendarsFromStates(hass) {
        if (!hass || !hass.states) {
            return [];
        }

        const locale = this.getLocale();
        return Object.entries(hass.states)
            .filter(([entityId]) => typeof entityId === "string" && entityId.startsWith("calendar."))
            .map(([entityId, stateObj]) => ({
                entity_id: entityId,
                name: stateObj?.attributes?.friendly_name || entityId
            }))
            .sort((a, b) => a.name.localeCompare(b.name, locale));
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

    updateCalendarsFromStates(hass) {
        const calendars = this.getCalendarsFromStates(hass);
        const prev = Array.isArray(this._stateCalendarsSnapshot) ? this._stateCalendarsSnapshot : [];
        const prevIds = prev.map(cal => cal.entity_id);
        const nextIds = calendars.map(cal => cal.entity_id);
        const changedLength = prevIds.length !== nextIds.length;
        const changedOrder = !changedLength && prevIds.some((id, index) => id !== nextIds[index]);
        const namesChanged = prev.length === calendars.length
            ? calendars.some((cal, index) => cal.name !== prev[index]?.name)
            : false;

        if (!changedLength && !changedOrder && !namesChanged) {
            return;
        }

        this._stateCalendarsSnapshot = calendars;

        if (this._hass) {
            this.refreshCalendarsFromApi(this._hass, {
                fallbackToStatesOnError: true
            });
        }
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
        if (!this.grid) {
            return;
        }

        this.grid.querySelectorAll(".time-line").forEach(el => el.remove());
        if (this.timeBar) {
            this.timeBar.querySelectorAll(".time-line").forEach(el => el.remove());
        }

        const now = new Date();
        const [start, end] = this.getWeekRange();
        if (now < start || now > end) return;

        const minutes = now.getHours() * 60 + now.getMinutes();
        const visibleStart = this.visibleStartMinute || 0;
        const visibleEnd = this.visibleEndMinute || 24 * 60;
        if (minutes < visibleStart || minutes > visibleEnd) {
            return;
        }

        const topPosition = this.timeAxisOffset + minutes * this.pixelsPerMinute;

        if (this.timeBar && this.weekOffset === 0) {
            const barLine = document.createElement("div");
            barLine.className = "time-line";
            barLine.style.top = `${topPosition}px`;
            this.timeBar.appendChild(barLine);
        }

        if (this.weekOffset !== 0) {
            return;
        }

        const todayOffset = (now.getDay() + 6) % 7;
        if (!this.dayColumns[todayOffset]) return;

        const line = document.createElement("div");
        line.className = "time-line";
        line.style.top = `${topPosition}px`;

        const viewport = this.dayColumns[todayOffset].querySelector(".timed-viewport");
        (viewport || this.dayColumns[todayOffset]).appendChild(line);
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
            fontFamily: "sans-serif", overflowY: "auto",
            padding: "clamp(12px, 4vw, 24px)",
            boxSizing: "border-box"
        });
        dialog.addEventListener("click", e => { if (e.target === dialog) dialog.remove(); });

        const content = document.createElement("div");
        Object.assign(content.style, {
            background: "#fff", padding: "24px", borderRadius: "12px",
            minWidth: "min(360px, calc(100vw - (2 * clamp(12px, 4vw, 24px))))",
            maxWidth: "600px", width: "100%",
            boxShadow: "0 8px 20px rgba(0,0,0,0.25)", display: "flex",
            flexDirection: "column", gap: "16px",
            maxHeight: "calc(100vh - 80px)", overflowY: "auto"
        });
        content.addEventListener("click", e => e.stopPropagation());

        const isAdmin = !!(this._hass?.user?.is_admin);
        const calendarNameLabels = [];
        const colorPickers = [];
        const calendarToggles = [];
        const dialogButtons = [];

        const languageRow = document.createElement("div");
        Object.assign(languageRow.style, {
            display: "flex",
            alignItems: "center",
            gap: "12px"
        });

        const languageLabel = document.createElement("label");
        Object.assign(languageLabel.style, {
            flex: "1",
            fontWeight: "600"
        });

        const languageSelect = document.createElement("select");
        Object.assign(languageSelect.style, {
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid transparent",
            fontSize: "0.95em",
            cursor: "pointer",
            background: "transparent"
        });

        const systemOption = document.createElement("option");
        systemOption.value = "system";
        languageSelect.appendChild(systemOption);

        Object.entries(LANGUAGE_NAMES).forEach(([code, name]) => {
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

        const themeRow = document.createElement("div");
        Object.assign(themeRow.style, {
            display: "flex",
            alignItems: "center",
            gap: "12px"
        });

        const themeLabel = document.createElement("label");
        Object.assign(themeLabel.style, {
            flex: "1",
            fontWeight: "600"
        });

        const themeSelect = document.createElement("select");
        Object.assign(themeSelect.style, {
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid transparent",
            fontSize: "0.95em",
            cursor: "pointer",
            background: "transparent"
        });

        const themeSystemOption = document.createElement("option");
        themeSystemOption.value = "system";
        themeSelect.appendChild(themeSystemOption);

        const themeLightOption = document.createElement("option");
        themeLightOption.value = "light";
        themeSelect.appendChild(themeLightOption);

        const themeDarkOption = document.createElement("option");
        themeDarkOption.value = "dark";
        themeSelect.appendChild(themeDarkOption);

        const themeSelectId = `calendar-week-card-theme-${Math.random().toString(36).slice(2, 8)}`;
        themeSelect.id = themeSelectId;
        themeLabel.setAttribute("for", themeSelectId);
        themeSelect.value = this.themePreference;

        themeRow.appendChild(themeLabel);
        themeRow.appendChild(themeSelect);
        content.appendChild(themeRow);

        const title = document.createElement("h3");
        Object.assign(title.style, { margin: 0, fontSize: "1.3em" });
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
            calendarToggles.push({ toggle, entity });

            const name = document.createElement("span");
            name.textContent = this.getCalendarName(entity);
            name.style.flex = "1";
            name.style.fontWeight = "500";
            calendarNameLabels.push(name);

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
            colorPickers.push({ picker, entity });
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

        const trimSection = document.createElement("div");
        Object.assign(trimSection.style, {
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "12px",
            borderRadius: "10px"
        });

        const trimHeader = document.createElement("div");
        Object.assign(trimHeader.style, {
            display: "flex",
            alignItems: "center",
            gap: "10px"
        });

        const trimToggle = document.createElement("input");
        trimToggle.type = "checkbox";
        trimToggle.checked = this.config.trim_unused_hours === true;
        trimToggle.style.width = "18px";
        trimToggle.style.height = "18px";
        trimToggle.style.cursor = "pointer";

        const trimLabel = document.createElement("span");
        trimLabel.style.flex = "1";
        trimLabel.style.fontWeight = "600";

        trimHeader.appendChild(trimToggle);
        trimHeader.appendChild(trimLabel);

        const trimDescription = document.createElement("span");
        trimDescription.style.fontSize = "0.85em";

        trimToggle.addEventListener("change", e => {
            const enabled = e.target.checked;
            this.config.trim_unused_hours = enabled;
            try {
                localStorage.setItem(this.trimUnusedHoursKey, String(enabled));
            } catch (err) {
                console.warn("calendar-week-card: Failed to persist trim preference", err);
            }
            this.renderList(this.lastEvents);
        });

        trimSection.appendChild(trimHeader);
        trimSection.appendChild(trimDescription);
        content.appendChild(trimSection);

        const highlightSection = document.createElement("div");
        Object.assign(highlightSection.style, {
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            padding: "12px",
            borderRadius: "10px"
        });

        const highlightHeader = document.createElement("div");
        Object.assign(highlightHeader.style, {
            display: "flex",
            alignItems: "center",
            gap: "10px"
        });

        const highlightToggle = document.createElement("input");
        highlightToggle.type = "checkbox";
        highlightToggle.checked = this.config.highlight_today !== false;
        highlightToggle.style.width = "18px";
        highlightToggle.style.height = "18px";
        highlightToggle.style.cursor = "pointer";

        const highlightLabel = document.createElement("span");
        highlightLabel.style.flex = "1";
        highlightLabel.style.fontWeight = "600";

        highlightHeader.appendChild(highlightToggle);
        highlightHeader.appendChild(highlightLabel);

        const highlightColorPicker = document.createElement("input");
        highlightColorPicker.type = "color";
        highlightColorPicker.value = this.getHexColor(this.config.today_highlight_color || "#4D96FF");
        highlightColorPicker.style.width = "50px";
        highlightColorPicker.style.height = "34px";
        highlightColorPicker.style.border = "1px solid transparent";
        highlightColorPicker.style.borderRadius = "8px";
        highlightColorPicker.style.cursor = "pointer";
        highlightColorPicker.style.marginLeft = "auto";

        const highlightDescriptionRow = document.createElement("div");
        Object.assign(highlightDescriptionRow.style, {
            display: "flex",
            alignItems: "center",
            gap: "12px"
        });

        const highlightDescription = document.createElement("span");
        highlightDescription.style.flex = "1";
        highlightDescription.style.fontSize = "0.85em";

        const applyHighlightState = enabled => {
            highlightColorPicker.disabled = !enabled;
            highlightColorPicker.style.opacity = enabled ? "1" : "0.5";
        };

        applyHighlightState(highlightToggle.checked);

        highlightToggle.addEventListener("change", e => {
            const enabled = e.target.checked;
            this.config.highlight_today = enabled;
            localStorage.setItem("calendar-week-card-highlight-enabled", String(enabled));
            applyHighlightState(enabled);
            this.renderList(this.lastEvents);
        });

        highlightColorPicker.addEventListener("input", e => {
            const value = this.getHexColor(e.target.value, this.config.today_highlight_color || "#4D96FF");
            this.config.today_highlight_color = value;
            localStorage.setItem("calendar-week-card-today-highlight-color", value);
            highlightColorPicker.value = value;
            this.renderList(this.lastEvents);
        });

        highlightSection.appendChild(highlightHeader);
        highlightDescriptionRow.appendChild(highlightDescription);
        highlightDescriptionRow.appendChild(highlightColorPicker);
        highlightSection.appendChild(highlightDescriptionRow);

        content.appendChild(highlightSection);

        let resetSection = null;
        let resetDescription = null;
        let resetButton = null;
        if (isAdmin) {
            resetSection = document.createElement("div");
            Object.assign(resetSection.style, {
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                padding: "12px",
                borderRadius: "10px"
            });

            resetDescription = document.createElement("span");
            resetDescription.style.fontSize = "0.9em";

            resetButton = this.createDialogButton(this.t("resetData"), {
                startColor: "#ff6b6b",
                endColor: "#ffaf7b"
            });

            resetButton.addEventListener("click", () => {
                if (!window.confirm(this.t("resetConfirmation"))) {
                    return;
                }
                this.clearStoredData();
                languageSelect.value = this.languagePreference;
                themeSelect.value = this.themePreference;
                highlightToggle.checked = this.config.highlight_today !== false;
                highlightColorPicker.value = this.getHexColor(this.config.today_highlight_color || "#4D96FF");
                applyHighlightState(highlightToggle.checked);
                trimToggle.checked = this.config.trim_unused_hours === true;
                calendarToggles.forEach(({ toggle, entity }) => {
                    const hidden = this.isEntityHidden(entity);
                    toggle.checked = !hidden;
                });
                colorPickers.forEach(({ picker, entity }) => {
                    picker.value = this.getHexColor(this.config.colors[entity]);
                    const hidden = this.isEntityHidden(entity);
                    picker.disabled = hidden;
                    picker.style.opacity = hidden ? "0.5" : "1";
                });
                applyDialogTheme();
                updateDialogText();
            });

            resetSection.appendChild(resetDescription);
            resetSection.appendChild(resetButton);
            content.appendChild(resetSection);
            dialogButtons.push(resetButton);
        }

        const Section = document.createElement("div");
        Object.assign(Section.style, {
            marginTop: "8px",
            display: "flex",
            justifyContent: "center",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            textAlign: "center"
        });

        const supportText = document.createElement("span");
        supportText.style.fontSize = "0.9em";
        Section.appendChild(supportText);

        const Url = "https://www.paypal.com/donate/?hosted_button_id=ABUTP5VLEUBS4";
        const Button = this.createDialogButton(this.t("supportWithPaypal"), {
            startColor: "#F9D423",
            endColor: "#FFCF00"
        });
        Button.style.minWidth = "200px";
        Button.addEventListener("click", () => {
            if (typeof window !== "undefined") {
                window.open(Url, "_blank", "noopener,noreferrer");
            }
        });
        Section.appendChild(Button);
        content.appendChild(Section);
        dialogButtons.push(Button);

        const closeBtn = this.createDialogButton(this.t("saveAndClose"));
        closeBtn.style.marginTop = "16px";
        closeBtn.style.alignSelf = "stretch";
        closeBtn.style.width = "100%";
        closeBtn.addEventListener("click", () => dialog.remove());
        content.appendChild(closeBtn);
        dialogButtons.push(closeBtn);

        const applyDialogTheme = () => {
            const palette = this.getDialogPalette();
            dialog.style.background = palette.overlay;
            content.style.background = palette.background;
            content.style.color = palette.text;
            languageLabel.style.color = palette.text;
            themeLabel.style.color = palette.text;
            title.style.color = palette.text;
            languageSelect.style.background = palette.inputBackground;
            languageSelect.style.border = `1px solid ${palette.border}`;
            languageSelect.style.color = palette.text;
            themeSelect.style.background = palette.inputBackground;
            themeSelect.style.border = `1px solid ${palette.border}`;
            themeSelect.style.color = palette.text;
            calendarNameLabels.forEach(label => {
                label.style.color = palette.text;
            });
            colorPickers.forEach(({ picker }) => {
                picker.style.border = `1px solid ${palette.border}`;
                picker.style.background = palette.inputBackground;
            });
            trimSection.style.background = this.theme === "dark"
                ? "rgba(66, 135, 245, 0.18)"
                : "rgba(66, 135, 245, 0.1)";
            trimSection.style.border = `1px solid ${palette.border}`;
            trimLabel.style.color = palette.text;
            trimDescription.style.color = palette.muted;
            highlightSection.style.background = this.theme === "dark"
                ? "rgba(77, 150, 255, 0.18)"
                : "rgba(77, 150, 255, 0.08)";
            highlightSection.style.border = `1px solid ${palette.border}`;
            highlightLabel.style.color = palette.text;
            highlightDescription.style.color = palette.muted;
            highlightColorPicker.style.border = `1px solid ${palette.border}`;
            highlightColorPicker.style.background = palette.inputBackground;
            supportText.style.color = palette.muted;
            if (resetSection) {
                resetSection.style.background = this.theme === "dark"
                    ? "rgba(255, 120, 120, 0.16)"
                    : "rgba(255, 120, 120, 0.08)";
                resetSection.style.border = `1px solid ${palette.border}`;
            }
            if (resetDescription) {
                resetDescription.style.color = palette.muted;
            }
            dialogButtons.forEach(btn => this.applyDialogButtonStyles(btn));
        };

        applyDialogTheme();

        const updateDialogText = () => {
            title.textContent = this.t("calendarColors");
            const languageLabelText = this.t("languageLabel");
            languageLabel.textContent = languageLabelText;
            systemOption.textContent = this.t("systemDefault");
            languageSelect.setAttribute("aria-label", languageLabelText);
            languageSelect.setAttribute("title", languageLabelText);
            const themeLabelText = this.t("themeLabel");
            themeLabel.textContent = themeLabelText;
            themeSelect.setAttribute("aria-label", themeLabelText);
            themeSelect.setAttribute("title", themeLabelText);
            themeSystemOption.textContent = this.t("themeSystem");
            themeLightOption.textContent = this.t("themeLight");
            themeDarkOption.textContent = this.t("themeDark");
            supportText.textContent = this.t("supportViaPaypal");
            const Text = this.t("supportWithPaypal");
            Button.textContent = Text;
            Button.setAttribute("aria-label", Text);
            Button.setAttribute("title", Text);
            closeBtn.textContent = this.t("saveAndClose");
            const trimLabelText = this.t("trimUnusedHours");
            trimLabel.textContent = trimLabelText;
            trimToggle.setAttribute("aria-label", trimLabelText);
            trimToggle.setAttribute("title", trimLabelText);
            trimDescription.textContent = this.t("trimUnusedHoursDescription");
            highlightLabel.textContent = this.t("highlightToday");
            highlightDescription.textContent = this.t("highlightTodayDescription");
            if (resetDescription) {
                resetDescription.textContent = this.t("resetDataDescription");
            }
            if (resetButton) {
                resetButton.textContent = this.t("resetData");
            }
        };

        languageSelect.addEventListener("change", e => {
            this.setLanguagePreference(e.target.value);
            languageSelect.value = this.languagePreference;
            updateDialogText();
        });

        themeSelect.addEventListener("change", e => {
            this.setThemePreference(e.target.value);
            themeSelect.value = this.themePreference;
            applyDialogTheme();
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

        const metaBar = document.createElement("div");
        Object.assign(metaBar.style, {
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            alignItems: "center"
        });

        if (ev.isAllDay) {
            const allDayChip = document.createElement("span");
            allDayChip.textContent = this.t("allDay");
            Object.assign(allDayChip.style, {
                background: "#eef3ff",
                color: "#1f3b73",
                borderRadius: "999px",
                padding: "4px 10px",
                fontSize: "0.75em",
                fontWeight: "600",
                letterSpacing: "0.04em",
                textTransform: "uppercase"
            });
            metaBar.appendChild(allDayChip);
        }

        if (metaBar.childElementCount) {
            content.appendChild(metaBar);
        }

        const locale = this.getLocale();
        const dateFormat = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
        const dateTimeFormat = { ...dateFormat, hour: "2-digit", minute: "2-digit" };
        const startDisplay = ev.isAllDay
            ? ev.start.toLocaleDateString(locale, dateFormat)
            : ev.start.toLocaleString(locale, dateTimeFormat);
        const endDateForDisplay = new Date(ev.end.getTime());
        if (ev.isAllDay) {
            endDateForDisplay.setMilliseconds(endDateForDisplay.getMilliseconds() - 1);
        }
        const endDisplay = ev.isAllDay
            ? endDateForDisplay.toLocaleDateString(locale, dateFormat)
            : endDateForDisplay.toLocaleString(locale, dateTimeFormat);

        const details = document.createElement("div");
        Object.assign(details.style, {
            display: "flex",
            flexDirection: "column",
            gap: "12px"
        });

        const addDetailRow = (label, value, options = {}) => {
            if (!value) return;
            const { isMultiline = false } = options;
            const row = document.createElement("div");
            Object.assign(row.style, {
                display: "flex",
                flexDirection: "column",
                gap: "4px"
            });

            const labelEl = document.createElement("span");
            labelEl.textContent = label;
            Object.assign(labelEl.style, {
                fontSize: "0.75em",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#666"
            });

            const valueEl = document.createElement("span");
            valueEl.textContent = value;
            Object.assign(valueEl.style, {
                color: "#333",
                fontSize: "0.95em",
                lineHeight: "1.4"
            });
            if (isMultiline) {
                valueEl.style.whiteSpace = "pre-wrap";
            }

            row.appendChild(labelEl);
            row.appendChild(valueEl);
            details.appendChild(row);
        };

        addDetailRow(this.t("calendar"), this.getCalendarName(ev.calendar));
        addDetailRow(this.t("start"), startDisplay);
        addDetailRow(this.t("end"), endDisplay);
        addDetailRow(this.t("location"), ev.location);
        addDetailRow(this.t("description"), ev.description, { isMultiline: true });

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

    static getStubConfig(hass) {
        const language = getSupportedLanguageForHass(hass);
        return { title: "Calendar Week", entities: [], colors: {}, language };
    }

    static getConfigElement() {
        return document.createElement("calendar-week-card-picker");
    }
}

