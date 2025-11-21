export const HOME_ASSISTANT_INTEGRATIONS_URL = "https://my.home-assistant.io/redirect/integrations/";
export const CARD_DOCUMENTATION_URL = "https://github.com/TheLuXoR/calendar-week-card?tab=readme-ov-file#register-calendars-in-home-assistant";

function withTranslate(translateFn) {
    return typeof translateFn === "function" ? translateFn : key => key;
}

export function buildNoCalendarsCopy(translateFn) {
    const t = withTranslate(translateFn);
    return {
        title: t("noCalendarsTitle"),
        description: t("noCalendarsDescription"),
        stepsIntro: t("noCalendarsStepsIntro"),
        steps: [
            t("noCalendarsStepIntegrations"),
            t("noCalendarsStepAdd"),
            t("noCalendarsStepVerify")
        ],
        settingsHint: t("noCalendarsSettingsHint"),
        linksTitle: t("noCalendarsLinksTitle"),
        links: [
            { label: t("noCalendarsOpenIntegrations"), url: HOME_ASSISTANT_INTEGRATIONS_URL },
            { label: t("noCalendarsReadGuide"), url: CARD_DOCUMENTATION_URL }
        ],
        actions: {
            openIntegrations: t("noCalendarsOpenIntegrations"),
            readGuide: t("noCalendarsReadGuide"),
            refresh: t("noCalendarsRefresh")
        }
    };
}

function createButton(buttonFactory, label, handler, extra = {}) {
    if (typeof buttonFactory === "function") {
        return buttonFactory(label, handler, extra);
    }

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    if (typeof handler === "function") {
        button.addEventListener("click", handler);
    }
    return button;
}

export function createNoCalendarsLayout(copy, options = {}) {
    const {
        handlers = {},
        buttonFactory = null
    } = options;

    const {
        onOpenIntegrations = null,
        onReadGuide = null,
        onRefresh = null
    } = handlers;

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

    buttonRow.appendChild(createButton(buttonFactory, copy.actions.openIntegrations, onOpenIntegrations, { action: "integrations" }));
    buttonRow.appendChild(createButton(buttonFactory, copy.actions.readGuide, onReadGuide, { action: "guide" }));
    buttonRow.appendChild(createButton(buttonFactory, copy.actions.refresh, onRefresh, { action: "refresh" }));
    card.appendChild(buttonRow);

    return card;
}
