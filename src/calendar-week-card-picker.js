import {
    FALLBACK_LANGUAGE,
    SUPPORTED_LANGUAGES,
    getLanguageOptions,
    getSupportedLanguageForHass,
    normalizeLanguage,
    translate
} from "./localization.js";
import { PICKER_STYLES } from "./styles.js";

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

export class CalendarWeekCardPickerEditor extends HTMLElement {
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

    async loadCalendars(force = false) {
        if (!this._hass || this._loadingCalendars || (this._calendarsLoaded && !force)) {
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
        style.textContent = PICKER_STYLES;
        this.shadowRoot.appendChild(style);

        const wrapper = document.createElement("div");
        wrapper.className = "picker-grid";

        const generalSection = document.createElement("div");
        generalSection.className = "section";
        generalSection.appendChild(this.createSectionHeader(this.t("generalSettings"), this.t("generalSettingsDescription")));

        const languageField = document.createElement("div");
        languageField.className = "field";
        const languageLabel = document.createElement("label");
        languageLabel.textContent = this.t("languageLabel");
        const languageSelect = document.createElement("select");
        this._languageOptions.forEach(option => {
            const opt = document.createElement("option");
            opt.value = option.value;
            opt.textContent = option.label;
            opt.selected = option.value === this._config.language;
            languageSelect.appendChild(opt);
        });
        languageSelect.addEventListener("change", event => this.updateLanguage(event.target.value));
        languageField.append(languageLabel, languageSelect);
        generalSection.appendChild(languageField);

        const calendarsSection = document.createElement("div");
        calendarsSection.className = "section";
        calendarsSection.appendChild(this.createSectionHeader(this.t("calendars"), this.t("calendarsDescription")));
        calendarsSection.appendChild(this.renderCalendarsList());

        wrapper.append(generalSection, calendarsSection);
        this.shadowRoot.appendChild(wrapper);
    }

    createSectionHeader(title, description) {
        const header = document.createElement("div");
        header.className = "section-header";
        const heading = document.createElement("h3");
        heading.textContent = title;
        const desc = document.createElement("p");
        desc.textContent = description;
        header.append(heading, desc);
        return header;
    }

    renderCalendarsList() {
        const section = document.createElement("div");
        section.className = "field";

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

registerCardPickerMetadata();

if (!customElements.get("calendar-week-card-picker")) {
    customElements.define("calendar-week-card-picker", CalendarWeekCardPickerEditor);
}
