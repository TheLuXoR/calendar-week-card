export const FALLBACK_LANGUAGE = "en";

export const TRANSLATIONS = {
    en: {
        today: "Today",
        allDay: "All day",
        location: "Location",
        description: "Description",
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
        donateWithPaypal: "Donate with PayPal",
        highlightToday: "Highlight current day",
        highlightTodayDescription: "Shade today's column with a subtle gradient.",
        todayHighlightColor: "Current day highlight"
    },
    de: {
        today: "Heute",
        allDay: "Ganztägig",
        location: "Ort",
        description: "Beschreibung",
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
        donateWithPaypal: "Mit PayPal spenden",
        highlightToday: "Aktuellen Tag hervorheben",
        highlightTodayDescription: "Markiert die heutige Spalte mit einem sanften Farbverlauf.",
        todayHighlightColor: "Aktuellen Tag hervorheben"
    },
    fr: {
        today: "Aujourd'hui",
        allDay: "Toute la journée",
        location: "Lieu",
        description: "Description",
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
        donateWithPaypal: "Faire un don avec PayPal",
        highlightToday: "Mettre en surbrillance aujourd'hui",
        highlightTodayDescription: "Colorer la colonne d'aujourd'hui avec un léger dégradé.",
        todayHighlightColor: "Mise en évidence du jour actuel"
    },
    es: {
        today: "Hoy",
        allDay: "Todo el día",
        location: "Ubicación",
        description: "Descripción",
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
        donateWithPaypal: "Donar con PayPal",
        highlightToday: "Resaltar el día actual",
        highlightTodayDescription: "Sombrea la columna de hoy con un degradado suave.",
        todayHighlightColor: "Resaltado del día actual"
    },
    it: {
        today: "Oggi",
        allDay: "Tutto il giorno",
        location: "Posizione",
        description: "Descrizione",
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
        donateWithPaypal: "Dona con PayPal",
        highlightToday: "Evidenzia il giorno corrente",
        highlightTodayDescription: "Colora la colonna di oggi con un leggero gradiente.",
        todayHighlightColor: "Evidenziazione del giorno corrente"
    },
    nl: {
        today: "Vandaag",
        allDay: "Hele dag",
        location: "Locatie",
        description: "Beschrijving",
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
        donateWithPaypal: "Doneren met PayPal",
        highlightToday: "Markeer de huidige dag",
        highlightTodayDescription: "Kleur de kolom van vandaag met een subtiele gradiënt.",
        todayHighlightColor: "Markering van de huidige dag"
    }
};

export const LANGUAGE_NAMES = {
    en: "English",
    de: "Deutsch",
    fr: "Français",
    es: "Español",
    it: "Italiano",
    nl: "Nederlands"
};

export const SUPPORTED_LANGUAGES = Object.keys(TRANSLATIONS);

export function normalizeLanguage(lang) {
    return (lang || "").toString().toLowerCase().split("-")[0];
}

export function getBrowserLanguages() {
    const languages = [];
    if (typeof navigator === "undefined") {
        return languages;
    }

    if (navigator.language) {
        languages.push(navigator.language);
    }

    if (Array.isArray(navigator.languages)) {
        navigator.languages.forEach(lang => {
            if (!languages.includes(lang)) {
                languages.push(lang);
            }
        });
    }

    return languages;
}

export function resolveLanguage(preference = "system", options = {}) {
    const {
        fallback = FALLBACK_LANGUAGE,
        supported = SUPPORTED_LANGUAGES,
        browserLanguages = getBrowserLanguages()
    } = options;

    if (preference && preference !== "system") {
        const normalizedPreference = normalizeLanguage(preference);
        if (supported.includes(normalizedPreference)) {
            return normalizedPreference;
        }
    }

    for (const lang of browserLanguages) {
        const normalized = normalizeLanguage(lang);
        if (supported.includes(normalized)) {
            return normalized;
        }
    }

    return fallback;
}

export function translate(locale, key) {
    const translations = TRANSLATIONS[locale] || TRANSLATIONS[FALLBACK_LANGUAGE];
    const fallbackTranslations = TRANSLATIONS[FALLBACK_LANGUAGE];
    return translations[key] || fallbackTranslations[key] || key;
}

export function getLanguageOptions() {
    return SUPPORTED_LANGUAGES.map(code => ({ code, label: LANGUAGE_NAMES[code] || code }));
}
