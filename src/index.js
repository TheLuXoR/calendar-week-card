import { CalendarWeekCard } from "./calendar-week-card.js";

if (!customElements.get("calendar-week-card")) {
    customElements.define("calendar-week-card", CalendarWeekCard);
}

export { CalendarWeekCard };
