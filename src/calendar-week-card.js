import {
    FALLBACK_LANGUAGE,
    LANGUAGE_NAMES,
    SUPPORTED_LANGUAGES,
    getLanguageOptions,
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

const THEME_VARIABLES = {
    light: {
        "--cwc-primary-text": "#1f1f1f",
        "--cwc-secondary-text": "#5f6368",
        "--cwc-background": "#ffffff",
        "--cwc-surface": "#ffffff",
        "--cwc-surface-alt": "#f5f7fa",
        "--cwc-week-bg": "#ffffff",
        "--cwc-timebar-bg": "#f5f7fa",
        "--cwc-timebar-text": "#1f1f1f",
        "--cwc-border-color": "rgba(0, 0, 0, 0.08)",
        "--cwc-button-bg": "rgba(66, 135, 245, 0.08)",
        "--cwc-button-bg-hover": "rgba(66, 135, 245, 0.15)",
        "--cwc-settings-icon-hover": "rgba(0, 0, 0, 0.08)",
        "--cwc-event-shadow": "5px 3px 5px rgba(15, 15, 30, 0.7)",
        "--cwc-event-border": "rgba(255, 255, 255, 0.35)",
        "--cwc-time-line-glow": "rgba(255, 59, 48, 0.35)",
        "--cwc-time-line-dot-border": "rgba(255, 255, 255, 0.85)",
        "--cwc-overlay": "rgba(0, 0, 0, 0.5)",
        "--cwc-dialog-background": "#ffffff",
        "--cwc-dialog-text": "#333333",
        "--cwc-dialog-muted": "#555555",
        "--cwc-dialog-divider": "rgba(0, 0, 0, 0.08)",
        "--cwc-today-glow": "rgba(77, 150, 255, 0.18)"
    },
    dark: {
        "--cwc-primary-text": "#f5f7ff",
        "--cwc-secondary-text": "#c4c8d2",
        "--cwc-background": "#11151c",
        "--cwc-surface": "#181c24",
        "--cwc-surface-alt": "#1f2430",
        "--cwc-week-bg": "#181c24",
        "--cwc-timebar-bg": "#1f2430",
        "--cwc-timebar-text": "#f5f7ff",
        "--cwc-border-color": "rgba(255, 255, 255, 0.12)",
        "--cwc-button-bg": "rgba(77, 150, 255, 0.12)",
        "--cwc-button-bg-hover": "rgba(77, 150, 255, 0.2)",
        "--cwc-settings-icon-hover": "rgba(255, 255, 255, 0.08)",
        "--cwc-event-shadow": "3px 2px 8px rgba(0, 0, 0, 0.85)",
        "--cwc-event-border": "rgba(255, 255, 255, 0.25)",
        "--cwc-time-line-glow": "rgba(255, 92, 70, 0.55)",
        "--cwc-time-line-dot-border": "rgba(17, 21, 28, 0.95)",
        "--cwc-overlay": "rgba(0, 0, 0, 0.65)",
        "--cwc-dialog-background": "#1b1f2a",
        "--cwc-dialog-text": "#e3e8ff",
        "--cwc-dialog-muted": "#b0b6c9",
        "--cwc-dialog-divider": "rgba(255, 255, 255, 0.12)",
        "--cwc-today-glow": "rgba(77, 150, 255, 0.35)"
    }
};

const THEME_ACCENT_FALLBACK = {
    light: "#ff3b30",
    dark: "#ff453a"
};

const HOME_ASSISTANT_INTEGRATIONS_URL = "https://my.home-assistant.io/redirect/integrations/";
const CARD_DOCUMENTATION_URL = "https://github.com/TheLuXoR/calendar-week-card?tab=readme-ov-file#register-calendars-in-home-assistant";

export class CalendarWeekCard extends HTMLElement {
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
        this._noCalendarsDialogVisible = false;
        this.inlineNoCalendarsContainer = null;
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
        const palette = THEME_VARIABLES[theme] || THEME_VARIABLES.light;
        Object.entries(palette).forEach(([variable, value]) => {
            this.style.setProperty(variable, value);
        });

        const accent = this.readCssColor("--accent-color", THEME_ACCENT_FALLBACK[theme] || THEME_ACCENT_FALLBACK.light);
        this.style.setProperty("--cwc-time-line-color", accent || THEME_ACCENT_FALLBACK[theme] || THEME_ACCENT_FALLBACK.light);
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
        return {
            title: this.t("noCalendarsTitle"),
            description: this.t("noCalendarsDescription"),
            stepsIntro: this.t("noCalendarsStepsIntro"),
            steps: [
                this.t("noCalendarsStepIntegrations"),
                this.t("noCalendarsStepAdd"),
                this.t("noCalendarsStepVerify")
            ],
            settingsHint: this.t("noCalendarsSettingsHint"),
            linksTitle: this.t("noCalendarsLinksTitle"),
            links: [
                { label: this.t("noCalendarsOpenIntegrations"), url: HOME_ASSISTANT_INTEGRATIONS_URL },
                { label: this.t("noCalendarsReadGuide"), url: CARD_DOCUMENTATION_URL }
            ],
            actions: {
                openIntegrations: this.t("noCalendarsOpenIntegrations"),
                readGuide: this.t("noCalendarsReadGuide"),
                refresh: this.t("noCalendarsRefresh"),
                close: this.t("close")
            }
        };
    }

    createInlineNoCalendarsContent() {
        const copy = this.getNoCalendarsContent();
        const card = document.createElement("div");
        card.className = "no-calendars-card";

        const title = document.createElement("h2");
        title.textContent = copy.title;
        card.appendChild(title);

        const description = document.createElement("p");
        description.textContent = copy.description;
        card.appendChild(description);

        const stepsIntro = document.createElement("p");
        stepsIntro.textContent = copy.stepsIntro;
        card.appendChild(stepsIntro);

        const stepsList = document.createElement("ol");
        stepsList.className = "no-calendars-steps";
        copy.steps.forEach(text => {
            const item = document.createElement("li");
            item.textContent = text;
            stepsList.appendChild(item);
        });
        card.appendChild(stepsList);

        const settingsHint = document.createElement("p");
        settingsHint.className = "no-calendars-settings-hint";
        settingsHint.textContent = copy.settingsHint;
        card.appendChild(settingsHint);

        const linksHeading = document.createElement("h3");
        linksHeading.textContent = copy.linksTitle;
        card.appendChild(linksHeading);

        const linksList = document.createElement("ul");
        linksList.className = "no-calendars-links";
        copy.links.forEach(({ label, url }) => {
            const li = document.createElement("li");
            const anchor = document.createElement("a");
            anchor.textContent = label;
            anchor.href = url;
            anchor.target = "_blank";
            anchor.rel = "noopener noreferrer";
            li.appendChild(anchor);
            linksList.appendChild(li);
        });
        card.appendChild(linksList);

        const buttonRow = document.createElement("div");
        buttonRow.className = "no-calendars-buttons";

        const createButton = (label, handler) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = label;
            if (typeof handler === "function") {
                btn.addEventListener("click", handler);
            }
            return btn;
        };

        const openIntegrations = () => {
            if (typeof window !== "undefined") {
                window.open(HOME_ASSISTANT_INTEGRATIONS_URL, "_blank", "noopener,noreferrer");
            }
        };
        const openGuide = () => {
            if (typeof window !== "undefined") {
                window.open(CARD_DOCUMENTATION_URL, "_blank", "noopener,noreferrer");
            }
        };
        const refreshCalendars = () => {
            if (this._hass) {
                this.ensureEntities(this._hass).then(() => this.loadEvents(this._hass));
            }
        };

        buttonRow.appendChild(createButton(copy.actions.openIntegrations, openIntegrations));
        buttonRow.appendChild(createButton(copy.actions.readGuide, openGuide));
        buttonRow.appendChild(createButton(copy.actions.refresh, refreshCalendars));
        card.appendChild(buttonRow);

        return card;
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
        this.showInlineNoCalendarsState();
        this.showNoCalendarsDialog();
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

    dismissNoCalendarsDialog() {
        if (typeof document === "undefined") {
            this._noCalendarsDialogVisible = false;
            return;
        }

        const existing = document.querySelector("#calendar-week-card-no-calendars");
        if (existing) {
            existing.remove();
        }
        this._noCalendarsDialogVisible = false;
    }

    showNoCalendarsDialog() {
        const hasConfiguredEntities = Array.isArray(this.config?.entities) && this.config.entities.length > 0;
        const hasAvailableCalendars = Array.isArray(this.availableCalendars) && this.availableCalendars.length > 0;

        if (typeof document === "undefined" || hasConfiguredEntities || hasAvailableCalendars || this._noCalendarsDialogVisible) {
            return;
        }

        const palette = this.getDialogPalette();
        const copy = this.getNoCalendarsContent();
        const dialogId = "calendar-week-card-no-calendars";
        const existing = document.querySelector(`#${dialogId}`);
        if (existing) {
            existing.remove();
        }

        const overlay = document.createElement("div");
        overlay.id = dialogId;
        Object.assign(overlay.style, {
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: palette.overlay,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            zIndex: 10000,
            fontFamily: "sans-serif"
        });

        const closeDialog = () => {
            overlay.remove();
            this._noCalendarsDialogVisible = false;
        };

        overlay.addEventListener("click", event => {
            if (event.target === overlay) {
                closeDialog();
            }
        });

        const content = document.createElement("div");
        Object.assign(content.style, {
            background: palette.background,
            color: palette.text,
            borderRadius: "16px",
            padding: "24px",
            maxWidth: "520px",
            width: "100%",
            boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            border: `1px solid ${palette.border}`
        });
        content.addEventListener("click", event => event.stopPropagation());

        const title = document.createElement("h2");
        title.textContent = copy.title;
        Object.assign(title.style, {
            margin: 0,
            fontSize: "1.35em",
            fontWeight: 700
        });

        const description = document.createElement("p");
        description.textContent = copy.description;
        Object.assign(description.style, {
            margin: 0,
            color: palette.muted,
            lineHeight: 1.5
        });

        const stepsIntro = document.createElement("p");
        stepsIntro.textContent = copy.stepsIntro;
        Object.assign(stepsIntro.style, {
            margin: 0,
            fontWeight: 600
        });

        const stepsList = document.createElement("ol");
        Object.assign(stepsList.style, {
            margin: 0,
            paddingLeft: "20px",
            color: palette.text,
            lineHeight: 1.5
        });

        copy.steps.forEach(text => {
            const item = document.createElement("li");
            item.textContent = text;
            stepsList.appendChild(item);
        });

        const settingsHint = document.createElement("p");
        settingsHint.textContent = copy.settingsHint;
        Object.assign(settingsHint.style, {
            margin: "4px 0 0 0",
            fontWeight: 600,
            color: palette.text
        });

        const linksHeading = document.createElement("h3");
        linksHeading.textContent = copy.linksTitle;
        Object.assign(linksHeading.style, {
            margin: "12px 0 0 0",
            fontSize: "1em",
            fontWeight: 600
        });

        const linksList = document.createElement("ul");
        Object.assign(linksList.style, {
            margin: 0,
            paddingLeft: "20px",
            color: palette.muted,
            lineHeight: 1.4
        });

        const addLink = (label, url) => {
            const li = document.createElement("li");
            const link = document.createElement("a");
            link.textContent = label;
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.style.color = this.readCssColor("--accent-color", "#4D96FF");
            link.style.fontWeight = 600;
            li.appendChild(link);
            linksList.appendChild(li);
        };

        copy.links.forEach(({ label, url }) => addLink(label, url));

        const buttonRow = document.createElement("div");
        Object.assign(buttonRow.style, {
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginTop: "16px"
        });

        const openIntegrationsButton = this.createDialogButton(copy.actions.openIntegrations);
        openIntegrationsButton.addEventListener("click", () => {
            if (typeof window !== "undefined") {
                window.open(HOME_ASSISTANT_INTEGRATIONS_URL, "_blank", "noopener,noreferrer");
            }
        });

        const guideButton = this.createDialogButton(copy.actions.readGuide);
        guideButton.addEventListener("click", () => {
            if (typeof window !== "undefined") {
                window.open(CARD_DOCUMENTATION_URL, "_blank", "noopener,noreferrer");
            }
        });

        const refreshButton = this.createDialogButton(copy.actions.refresh);
        refreshButton.addEventListener("click", () => {
            closeDialog();
            if (this._hass) {
                this.ensureEntities(this._hass).then(() => this.loadEvents(this._hass));
            }
        });

        const closeButton = this.createDialogButton(copy.actions.close);
        closeButton.addEventListener("click", closeDialog);

        [openIntegrationsButton, guideButton, refreshButton, closeButton].forEach(btn => {
            btn.style.flex = "1 1 200px";
        });

        buttonRow.appendChild(openIntegrationsButton);
        buttonRow.appendChild(guideButton);
        buttonRow.appendChild(refreshButton);
        buttonRow.appendChild(closeButton);

        content.appendChild(title);
        content.appendChild(description);
        content.appendChild(stepsIntro);
        content.appendChild(stepsList);
        content.appendChild(settingsHint);
        content.appendChild(linksHeading);
        content.appendChild(linksList);
        content.appendChild(buttonRow);

        overlay.appendChild(content);
        document.body.appendChild(overlay);
        this._noCalendarsDialogVisible = true;
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
        this._entitiesPromise = undefined;

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
                color: var(--cwc-primary-text, var(--primary-text-color, #1f1f1f));
                overflow: hidden;
                background: var(--cwc-background, var(--card-background-color, #ffffff));
                --cwc-primary-text: var(--primary-text-color, #1f1f1f);
                --cwc-secondary-text: var(--secondary-text-color, #5f6368);
                --cwc-background: #ffffff;
                --cwc-surface: #ffffff;
                --cwc-surface-alt: #f5f7fa;
                --cwc-week-bg: #ffffff;
                --cwc-timebar-bg: #f5f7fa;
                --cwc-timebar-text: var(--primary-text-color, #1f1f1f);
                --cwc-border-color: rgba(0, 0, 0, 0.08);
                --cwc-button-bg: rgba(66, 135, 245, 0.08);
                --cwc-button-bg-hover: rgba(66, 135, 245, 0.15);
                --cwc-settings-icon-hover: rgba(0, 0, 0, 0.08);
                --cwc-event-shadow: 5px 3px 5px rgba(15, 15, 30, 0.7);
                --cwc-event-border: rgba(255, 255, 255, 0.35);
                --cwc-time-line-color: #ff3b30;
                --cwc-time-line-glow: rgba(255, 59, 48, 0.35);
                --cwc-time-line-dot-border: rgba(255, 255, 255, 0.85);
                --cwc-overlay: rgba(0, 0, 0, 0.5);
                --cwc-dialog-background: #ffffff;
                --cwc-dialog-text: #333333;
                --cwc-dialog-muted: #555555;
                --cwc-dialog-divider: rgba(0, 0, 0, 0.08);
                --cwc-today-glow: rgba(77, 150, 255, 0.18);
            }
            :host(.theme-dark) {
                --cwc-primary-text: #f5f7ff;
                --cwc-secondary-text: #c4c8d2;
                --cwc-background: #11151c;
                --cwc-surface: #181c24;
                --cwc-surface-alt: #1f2430;
                --cwc-week-bg: #181c24;
                --cwc-timebar-bg: #1f2430;
                --cwc-timebar-text: #f5f7ff;
                --cwc-border-color: rgba(255, 255, 255, 0.12);
                --cwc-button-bg: rgba(77, 150, 255, 0.12);
                --cwc-button-bg-hover: rgba(77, 150, 255, 0.2);
                --cwc-settings-icon-hover: rgba(255, 255, 255, 0.08);
                --cwc-event-shadow: 3px 2px 8px rgba(0, 0, 0, 0.85);
                --cwc-event-border: rgba(255, 255, 255, 0.25);
                --cwc-time-line-color: #ff453a;
                --cwc-time-line-glow: rgba(255, 92, 70, 0.55);
                --cwc-time-line-dot-border: rgba(17, 21, 28, 0.95);
                --cwc-overlay: rgba(0, 0, 0, 0.65);
                --cwc-dialog-background: #1b1f2a;
                --cwc-dialog-text: #e3e8ff;
                --cwc-dialog-muted: #b0b6c9;
                --cwc-dialog-divider: rgba(255, 255, 255, 0.12);
                --cwc-today-glow: rgba(77, 150, 255, 0.35);
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
                color: var(--cwc-primary-text);
            }
            .nav-buttons {
                display: flex;
                gap: 6px;
            }
            .nav-buttons button {
                border: none;
                background: var(--cwc-button-bg);
                color: var(--accent-color, #4287f5);
                cursor: pointer;
                font-size: 0.85em;
                padding: 6px 10px;
                border-radius: 8px;
                font-weight: 600;
                transition: background 0.2s ease, transform 0.2s ease;
            }
            .nav-buttons button:hover {
                background: var(--cwc-button-bg-hover);
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
                background: var(--cwc-settings-icon-hover);
            }
            .week-header {
                display: grid;
                grid-template-columns: 60px repeat(7, 1fr);
                text-align: center;
                font-weight: 600;
                padding: 0 6px 8px;
                color: var(--cwc-secondary-text);
                border-bottom: 1px solid var(--cwc-border-color);
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
                overflow: hidden;
                background: var(--cwc-week-bg);
                min-height: 0;
            }
            .time-bar {
                position: relative;
                width: 64px;
                border-right: 1px solid var(--cwc-border-color);
                font-size: 11px;
                background: var(--cwc-timebar-bg);
                flex-shrink: 0;
                overflow: hidden;
                min-height: 0;
            }
            .hour-label {
                position: absolute;
                left: 6px;
                font-size: 11px;
                color: var(--cwc-timebar-text, var(--cwc-primary-text));
                transform: translateY(-50%);
            }
            .week-grid {
                position: relative;
                flex: 1;
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                height: 100%;
                width: 100%;
                overflow: visible;
                background: var(--cwc-week-bg);
                min-height: 0;
            }
            .day-column {
                position: relative;
                border-left: 1px solid var(--cwc-border-color);
                background: transparent;
                display: flex;
                flex-direction: column;
                padding: 0 3px 0 1px;
                gap: 0;
                box-sizing: border-box;
                min-height: 0;
                overflow: visible;
                z-index: 1;
            }
            .day-column::before {
                content: "";
                position: absolute;
                background: transparent;
                opacity: 0;
                transition: opacity 0.25s ease;
                pointer-events: none;
                z-index: 0;
                top: -6px;
                bottom: -6px;
                left: -2px;
                right: -2px;
                border-radius: 12px;
            }
            .day-column.today-column::before {
                background: var(--calendar-week-card-today-overlay, rgba(77, 150, 255, 0.16));
                opacity: 1;
                box-shadow: 0 0 18px 6px var(--cwc-today-glow);
            }
            .day-column > * {
                position: relative;
                z-index: 1;
            }
            .day-column:first-child {
                border-left: none;
            }
            .timed-viewport {
                position: relative;
                flex: 1;
                width: 100%;
                min-height: 0;
                overflow: visible;
            }
            .timed-events {
                position: relative;
                width: 100%;
                height: 100%;
                min-height: 0;
                z-index: 1;
            }
            .event {
                border-radius: 6px;
                font-size: 12px;
                line-height: 1.3;
                overflow: hidden;
                box-shadow: var(--cwc-event-shadow);
                cursor: pointer;
                border: 1px solid var(--cwc-event-border);
                backdrop-filter: saturate(130%);
                transition: box-shadow 0.2s ease, transform 0.2s ease;
                box-sizing: border-box;
                padding: 0;
            }
            .event:hover {
                transform: translateY(-1px);
                box-shadow: 6px 6px 6px rgba(15, 15, 30, 0.22);
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
                padding: 4px 10px;
                flex-direction: row;
                align-items: center;
                gap: 6px;
                flex-wrap: wrap;
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
                font-size: 0.9em;
                margin-bottom: 0;
                letter-spacing: 0.005em;
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
                letter-spacing: 0.05em;
                padding: 2px 8px;
                line-height: 1.3;
                background: rgba(255, 255, 255, 0.3);
                color: inherit;
                white-space: nowrap;
                font-size: 0.75em;
            }
            .event.event-light-text .event-tag {
                background: rgba(0, 0, 0, 0.25);
                color: #ffffff;
            }
            .event.event-dark-text .event-tag {
                background: rgba(255, 255, 255, 0.55);
                color: #1f1f1f;
            }
            .event-all-day-tag {
                font-size: 0.85em;
                margin-left: auto;
                opacity: 1;
                letter-spacing: 0.03em;
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
            .event.timed-event.event-compact .event-surface {
                padding: 4px 6px;
                justify-content: center;
                gap: 2px;
            }
            .event.timed-event.event-compact .event-title {
                font-size: 0.85em;
                white-space: normal;
                line-height: 1.2;
            }
            .event.timed-event.event-compact .event-time {
                font-size: 0.75em;
                opacity: 1;
            }
            .time-line {
                position: absolute;
                left: 0;
                right: 0;
                height: 2px;
                background: var(--cwc-time-line-color);
                z-index: 40;
                box-shadow: 0 0 12px var(--cwc-time-line-glow), 0 0 0 1px rgba(255, 255, 255, 0.35);
                pointer-events: none;
            }
            .day-column .time-line {
                left: 1px;
                right: 3px;
            }
            .no-calendars-inline {
                width: 100%;
                box-sizing: border-box;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 24px;
            }
            .no-calendars-inline[hidden] {
                display: none !important;
            }
            .no-calendars-card {
                width: min(640px, 100%);
                background: var(--cwc-surface, var(--card-background-color, #ffffff));
                border-radius: 16px;
                border: 1px solid var(--cwc-border-color, rgba(0, 0, 0, 0.08));
                padding: 24px;
                box-shadow: 0 12px 30px rgba(15, 15, 30, 0.08);
                display: flex;
                flex-direction: column;
                gap: 12px;
                color: var(--cwc-primary-text);
            }
            .no-calendars-card h2 {
                margin: 0;
                font-size: 1.35em;
                font-weight: 700;
                color: var(--cwc-primary-text);
            }
            .no-calendars-card h3 {
                margin: 8px 0 0;
                font-size: 1em;
                font-weight: 600;
                color: var(--cwc-primary-text);
            }
            .no-calendars-card p {
                margin: 0;
                line-height: 1.5;
                color: var(--cwc-secondary-text);
            }
            .no-calendars-settings-hint {
                font-weight: 600;
                color: var(--cwc-primary-text);
            }
            .no-calendars-steps {
                margin: 0;
                padding-left: 20px;
                color: var(--cwc-primary-text);
                line-height: 1.5;
            }
            .no-calendars-links {
                margin: 0;
                padding-left: 20px;
                color: var(--cwc-secondary-text);
                line-height: 1.4;
            }
            .no-calendars-links a {
                color: var(--accent-color, #4D96FF);
                font-weight: 600;
                text-decoration: none;
            }
            .no-calendars-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 8px;
            }
            .no-calendars-buttons button {
                flex: 1 1 180px;
                border: none;
                border-radius: 999px;
                padding: 10px 16px;
                font-weight: 600;
                cursor: pointer;
                background: var(--cwc-button-bg, rgba(66, 135, 245, 0.08));
                color: var(--accent-color, #4D96FF);
                transition: background 0.2s ease, transform 0.2s ease;
            }
            .no-calendars-buttons button:hover {
                background: var(--cwc-button-bg-hover, rgba(66, 135, 245, 0.15));
                transform: translateY(-1px);
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
        <div class="no-calendars-inline" hidden></div>
        `;

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
        this.loadEvents(hass);
    }

    async loadEvents(hass) {
        await this.ensureEntities(hass);

        const entities = this.getActiveEntities();
        const visibleEntities = entities.filter(entity => !this.isEntityHidden(entity));

        if (!visibleEntities.length) {
            if (!entities.length && !this.config?.entities?.length) {
                this.presentNoCalendarsState();
            } else {
                this.hideInlineNoCalendarsState();
            }
            this.renderList([]);
            return;
        }

        this.dismissNoCalendarsDialog();
        this.hideInlineNoCalendarsState();

        const [start, end] = this.getWeekRange();
        let allEvents = [];

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
            }
        }

        allEvents.sort((a, b) => a.start - b.start);
        this.renderList(allEvents);
    }
    renderList(events) {
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
            dayRenderData.push({ dayEvents, allDayEvents, timedContainer, dayColumn, dayOffset });
        }

        const trimUnusedHours = this.config.trim_unused_hours === true;
        let earliestStart = Infinity;
        let latestEnd = -Infinity;

        if (trimUnusedHours) {
            dayRenderData.forEach(({ dayEvents }) => {
                dayEvents.forEach(ev => {
                    const startMinutes = ev.start.getHours() * 60 + ev.start.getMinutes();
                    let endMinutes = ev.end.getHours() * 60 + ev.end.getMinutes();
                    if (endMinutes <= startMinutes) {
                        const durationMinutes = Math.max((ev.end - ev.start) / (1000 * 60), 1);
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
                const allDayTextColor = this.getReadableTextColor(gradientStart);
                eventDiv.style.color = allDayTextColor;
                eventDiv.classList.add(allDayTextColor === "#ffffff" ? "event-light-text" : "event-dark-text");

                const eventSurface = document.createElement("div");
                eventSurface.className = "event-surface all-day-surface";

                const titleEl = document.createElement("div");
                titleEl.className = "event-title";
                titleEl.textContent = ev.isUntitled ? this.t("noTitle") : ev.title;

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
                for (let i = activeStack.length - 1; i >= 0; i--) {
                    if (activeStack[i].end <= ev.start) activeStack.splice(i, 1);
                }

                let maxCol = -1;
                activeStack.forEach(e => { if (e.column > maxCol) maxCol = e.column; });
                ev.column = maxCol + 1;
                activeStack.push(ev);

                if (ev.column > maxColumnIndex) {
                    maxColumnIndex = ev.column;
                }
            }

            const totalColumns = Math.max(maxColumnIndex + 1, 1);
            const containerWidth = timedContainer.clientWidth || timedContainer.offsetWidth || 0;

            // 2) Second pass: actually render with dynamic left indentation
            for (const ev of dayEvents) {
                const startMinutes = ev.start.getHours() * 60 + ev.start.getMinutes();
                let endMinutes = ev.end.getHours() * 60 + ev.end.getMinutes();
                if (endMinutes <= startMinutes) {
                    const durationMinutes = Math.max((ev.end - ev.start) / (1000 * 60), 1);
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

        this._entitiesPromise = (async () => {
            try {
                const calendars = await hass.callApi("get", "calendars");
                const list = Array.isArray(calendars) ? calendars : [];
                this.availableCalendars = list.filter(cal => cal?.entity_id);
                this.dynamicEntities = this.availableCalendars.map(cal => cal.entity_id);
                this.assignDefaultColors(this.dynamicEntities);
                if (this.dynamicEntities.length) {
                    this.dismissNoCalendarsDialog();
                    this.hideInlineNoCalendarsState();
                } else if (!this.config?.entities?.length) {
                    this.presentNoCalendarsState();
                }
            } catch (err) {
                console.error("calendar-week-card: Failed to load calendars", err);
                this.availableCalendars = [];
                this.dynamicEntities = [];
                if (!this.config?.entities?.length) {
                    this.presentNoCalendarsState();
                }
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

const CARD_PICKER_TYPE = "calendar-week-card";

function registerCardPickerMetadata() {
    if (typeof window === "undefined") {
        return;
    }

    window.customCards = window.customCards || [];
    const alreadyRegistered = window.customCards.some(card => card && card.type === CARD_PICKER_TYPE);
    if (alreadyRegistered) {
        return;
    }

    const setLanguageAction = {
        name: "Match Home Assistant language",
        description: "Set the card language to your Home Assistant language or English if unsupported.",
        handle(cardElement, hass, currentConfig = {}) {
            const language = getSupportedLanguageForHass(hass);
            const nextConfig = { ...currentConfig, language };
            if (cardElement && typeof cardElement.setConfig === "function") {
                try {
                    cardElement.setConfig(nextConfig);
                } catch (err) {
                    console.warn("calendar-week-card: Failed to apply language action", err);
                }
            }
            return nextConfig;
        }
    };

    window.customCards.push({
        type: CARD_PICKER_TYPE,
        name: "Calendar Week Card",
        description: "Weekly calendar grid with automatic entity discovery and color management.",
        documentationURL: "https://github.com/TheLuXoR/calendar-week-card",
        preview: true,
        actions: [setLanguageAction]
    });
}

registerCardPickerMetadata();

class CalendarWeekCardPickerEditor extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._config = { entities: [], language: "system" };
        this._hass = null;
        this._calendars = [];
        this._calendarsError = null;
        this._loadingCalendars = false;
        this._calendarsLoaded = false;
        this._languageOptions = getLanguageOptions();
    }

    connectedCallback() {
        this.render();
    }

    set hass(value) {
        this._hass = value;
        if (value && !this._calendarsLoaded && !this._loadingCalendars) {
            this.loadCalendars();
        } else {
            this.render();
        }
    }

    setConfig(config = {}) {
        const entities = Array.isArray(config.entities) ? [...config.entities] : [];
        const normalizedLanguage = typeof config.language === "string" && config.language !== "system"
            ? normalizeLanguage(config.language)
            : "system";
        const language = normalizedLanguage === "system" || !SUPPORTED_LANGUAGES.includes(normalizedLanguage)
            ? "system"
            : normalizedLanguage;
        const hiddenEntities = Array.isArray(config.hidden_entities) ? [...config.hidden_entities] : undefined;
        this._config = { ...config, entities, hidden_entities: hiddenEntities, language };
        this.render();
    }

    get valueLanguage() {
        const pref = this._config?.language || "system";
        if (pref && pref !== "system") {
            return normalizeLanguage(pref);
        }
        if (this._hass) {
            return getSupportedLanguageForHass(this._hass);
        }
        return FALLBACK_LANGUAGE;
    }

    t(key) {
        return translate(this.valueLanguage, key);
    }

    async loadCalendars() {
        if (!this._hass || this._loadingCalendars || this._calendarsLoaded) {
            return;
        }
        this._loadingCalendars = true;
        this._calendarsError = null;
        this.render();
        try {
            const api = this._hass.callApi;
            const calendars = typeof api === "function" ? await api("get", "calendars") : [];
            const list = Array.isArray(calendars) ? calendars : [];
            this._calendars = list
                .filter(item => item && item.entity_id)
                .map(item => ({
                    entity_id: item.entity_id,
                    name: item.name || item.entity_id
                }))
                .sort((a, b) => a.name.localeCompare(b.name, this.valueLanguage));
            this.maybeAdoptHiddenEntities();
            this._calendarsLoaded = true;
        } catch (err) {
            console.warn("calendar-week-card: Failed to load calendars for picker", err);
            this._calendars = [];
            this._calendarsError = err;
        } finally {
            this._loadingCalendars = false;
            this.render();
        }
    }

    maybeAdoptHiddenEntities() {
        if (!Array.isArray(this._config?.entities) || !this._config.entities.length) {
            return;
        }
        if (Array.isArray(this._config.hidden_entities)) {
            return;
        }
        if (!this._calendars.length) {
            return;
        }
        const available = this._calendars.map(calendar => calendar.entity_id);
        const hidden = available.filter(entityId => !this._config.entities.includes(entityId));
        this._config.hidden_entities = hidden;
    }

    render() {
        if (!this.shadowRoot) return;
        this.shadowRoot.innerHTML = "";
        const style = document.createElement("style");
        style.textContent = `
            :host {
                display: block;
                font-family: var(--primary-font-family, "Roboto", sans-serif);
                color: var(--primary-text-color, #1c1c1c);
            }
            .picker-grid {
                display: grid;
                gap: 16px;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            }
            .section {
                background: var(--ha-card-background, var(--card-background-color, #fff));
                border-radius: 12px;
                padding: 16px;
                box-shadow: var(--ha-card-box-shadow, none);
                border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
            }
            .section-header h3 {
                margin: 0;
                font-size: 1rem;
                font-weight: 600;
            }
            .section-header p {
                margin: 4px 0 12px;
                color: var(--secondary-text-color, #6b6b6b);
                font-size: 0.9rem;
            }
            .field {
                display: flex;
                flex-direction: column;
                gap: 6px;
                font-size: 0.95rem;
            }
            select {
                font: inherit;
                padding: 8px 10px;
                border-radius: 8px;
                border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.2));
                background: var(--input-fill-color, #fff);
                color: inherit;
            }
            .calendar-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-height: 320px;
                overflow: auto;
                padding-right: 4px;
            }
            .calendar-option {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                padding: 8px;
                border-radius: 10px;
                border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.1));
                background: var(--ha-card-background, rgba(0, 0, 0, 0.02));
            }
            .calendar-option span {
                font-weight: 600;
            }
            .calendar-option small {
                display: block;
                color: var(--secondary-text-color, #6b6b6b);
                font-size: 0.8rem;
            }
            .placeholder {
                padding: 8px 0;
                color: var(--secondary-text-color, #6b6b6b);
                font-size: 0.9rem;
            }
            .placeholder.error {
                color: var(--error-color, #c62828);
            }
        `;
        this.shadowRoot.appendChild(style);

        const grid = document.createElement("div");
        grid.className = "picker-grid";
        grid.appendChild(this.renderLanguageSection());
        grid.appendChild(this.renderCalendarsSection());
        this.shadowRoot.appendChild(grid);
    }

    renderLanguageSection() {
        const section = document.createElement("div");
        section.className = "section";

        const header = document.createElement("div");
        header.className = "section-header";
        const title = document.createElement("h3");
        title.textContent = this.t("languageLabel");
        const description = document.createElement("p");
        description.textContent = this.t("pickerLanguageHelper");
        header.append(title, description);

        const field = document.createElement("label");
        field.className = "field";
        const label = document.createElement("span");
        label.textContent = this.t("languageLabel");
        const select = document.createElement("select");
        select.value = this._config?.language || "system";
        const languageOptions = [
            { code: "system", label: this.t("systemDefault") },
            ...this._languageOptions
        ];
        languageOptions.forEach(({ code, label }) => {
            const option = document.createElement("option");
            option.value = code;
            option.textContent = label;
            select.appendChild(option);
        });
        select.addEventListener("change", event => {
            this.updateLanguage(event.target.value);
        });

        field.append(label, select);
        section.append(header, field);
        return section;
    }

    renderCalendarsSection() {
        const section = document.createElement("div");
        section.className = "section";

        const header = document.createElement("div");
        header.className = "section-header";
        const title = document.createElement("h3");
        title.textContent = this.t("pickerCalendarsTitle");
        const description = document.createElement("p");
        description.textContent = this.t("pickerCalendarsDescription");
        header.append(title, description);
        section.appendChild(header);

        if (!this._hass) {
            const pending = document.createElement("div");
            pending.className = "placeholder";
            pending.textContent = this.t("pickerCalendarsLoading");
            section.appendChild(pending);
            return section;
        }

        if (this._loadingCalendars) {
            const loading = document.createElement("div");
            loading.className = "placeholder";
            loading.textContent = this.t("pickerCalendarsLoading");
            section.appendChild(loading);
            return section;
        }

        if (this._calendarsError) {
            const error = document.createElement("div");
            error.className = "placeholder error";
            error.textContent = this._calendarsError.message || this._calendarsError.toString();
            section.appendChild(error);
            return section;
        }

        if (!this._calendars.length) {
            const empty = document.createElement("div");
            empty.className = "placeholder";
            empty.textContent = this.t("pickerCalendarsEmpty");
            section.appendChild(empty);
            return section;
        }

        const list = document.createElement("div");
        list.className = "calendar-list";
        const selectedSet = this.getSelectedCalendars();
        this._calendars.forEach(calendar => {
            const option = document.createElement("label");
            option.className = "calendar-option";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = selectedSet.has(calendar.entity_id);
            checkbox.addEventListener("change", event => {
                this.toggleCalendar(calendar.entity_id, event.target.checked);
            });
            const texts = document.createElement("div");
            const name = document.createElement("span");
            name.textContent = calendar.name || calendar.entity_id;
            const entity = document.createElement("small");
            entity.textContent = calendar.entity_id;
            texts.append(name, entity);
            option.append(checkbox, texts);
            list.appendChild(option);
        });
        section.appendChild(list);
        return section;
    }

    getHiddenCalendarsSet() {
        if (Array.isArray(this._config?.hidden_entities)) {
            return new Set(this._config.hidden_entities);
        }
        return null;
    }

    getSelectedCalendars() {
        const available = this._calendars.map(calendar => calendar.entity_id);
        const hiddenSet = this.getHiddenCalendarsSet();
        if (hiddenSet) {
            return new Set(available.filter(entityId => !hiddenSet.has(entityId)));
        }
        const configured = Array.isArray(this._config?.entities) ? this._config.entities : [];
        if (configured.length) {
            return new Set(configured);
        }
        return new Set(available);
    }

    updateLanguage(value) {
        if (value === "system" || !value) {
            this._config.language = "system";
        } else {
            const normalized = normalizeLanguage(value);
            this._config.language = SUPPORTED_LANGUAGES.includes(normalized) ? normalized : "system";
        }
        this.dispatchConfigChanged();
        this.render();
    }

    toggleCalendar(entityId, checked) {
        if (!entityId) return;
        const hiddenSet = this.getHiddenCalendarsSet() || new Set();
        if (checked) {
            hiddenSet.delete(entityId);
        } else {
            hiddenSet.add(entityId);
        }
        this._config.hidden_entities = Array.from(hiddenSet);
        this._config.entities = [];
        this.dispatchConfigChanged();
        this.render();
    }

    dispatchConfigChanged() {
        const config = { ...this._config };
        if (Array.isArray(this._config.entities) && this._config.entities.length) {
            config.entities = [...this._config.entities];
        } else {
            delete config.entities;
        }
        if (Array.isArray(this._config.hidden_entities)) {
            const hiddenCopy = [...this._config.hidden_entities];
            if (hiddenCopy.length) {
                config.hidden_entities = hiddenCopy;
            } else {
                delete config.hidden_entities;
            }
        } else {
            delete config.hidden_entities;
        }
        this.dispatchEvent(new CustomEvent("config-changed", {
            detail: { config },
            bubbles: true,
            composed: true
        }));
    }
}

if (!customElements.get("calendar-week-card-picker")) {
    customElements.define("calendar-week-card-picker", CalendarWeekCardPickerEditor);
}
