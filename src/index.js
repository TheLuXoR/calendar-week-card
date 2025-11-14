import { CalendarWeekCard } from "./calendar-week-card.js";

if (!customElements.get("calendar-week-card")) {
    customElements.define("calendar-week-card", CalendarWeekCard);
}

if (typeof window !== "undefined") {
    window.customCards = window.customCards || [];
    const cardEntry = {
        type: "custom:calendar-week-card",
        name: "Calendar Week Card",
        description: "Week-based calendar view with multiple calendars and advanced styling."
    };
    if (!window.customCards.some(card => card.type === cardEntry.type)) {
        window.customCards.push(cardEntry);
    }
}

export { CalendarWeekCard };
