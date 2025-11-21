const CARD_STYLES = `
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
        min-height: 0;
    }
    .day-header {
        position: sticky;
        top: 0;
        z-index: 3;
        padding: 8px 10px 10px;
        background: linear-gradient(180deg, var(--cwc-surface-alt), rgba(255, 255, 255, 0));
        border-bottom: 1px solid var(--cwc-border-color);
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
    }
    .day-header .date {
        font-weight: 700;
        font-size: 0.95em;
        padding: 2px 8px;
        border-radius: 10px;
        color: var(--cwc-primary-text);
        transition: background 0.2s ease, color 0.2s ease;
    }
    .day-header .today {
        background: rgba(77, 150, 255, 0.12);
        color: var(--accent-color, #4287f5);
        box-shadow: 0 6px 20px rgba(77, 150, 255, 0.18);
    }
    .weekday-name {
        color: var(--cwc-secondary-text);
        font-size: 0.9em;
        letter-spacing: 0.02em;
    }
    .events-container {
        position: relative;
        flex: 1;
        display: grid;
        grid-template-rows: auto 1fr;
        grid-template-columns: 1fr;
        overflow: hidden;
        min-height: 0;
    }
    .all-day-container {
        position: relative;
        min-height: 24px;
        padding: 4px 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0));
        border-bottom: 1px solid var(--cwc-border-color);
        overflow: hidden;
        z-index: 1;
    }
    .all-day-event {
        padding: 3px 10px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        color: var(--cwc-primary-text);
        background: rgba(77, 150, 255, 0.08);
        border: 1px solid rgba(77, 150, 255, 0.2);
        box-shadow: 0 4px 12px rgba(77, 150, 255, 0.08);
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .all-day-event:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 25px rgba(77, 150, 255, 0.18);
    }
    .all-day-event .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
    }
    .time-grid {
        position: relative;
        flex: 1;
        overflow: auto;
        min-height: 0;
        background: var(--cwc-week-bg);
    }
    .grid-lines {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1;
        pointer-events: none;
    }
    .grid-line {
        position: absolute;
        left: 0;
        right: 0;
        border-top: 1px dashed var(--cwc-border-color);
    }
    .event-item {
        position: absolute;
        left: 4px;
        right: 4px;
        border-radius: 12px;
        padding: 8px 10px;
        box-shadow: var(--cwc-event-shadow);
        color: var(--cwc-primary-text);
        border: 1px solid var(--cwc-event-border);
        background: #ffffff;
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .event-item:hover {
        transform: translateY(-2px) scale(1.01);
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
    }
    .event-title {
        font-size: 0.95em;
        font-weight: 700;
        margin: 0 0 2px;
        line-height: 1.4;
    }
    .event-time {
        font-size: 0.8em;
        opacity: 0.9;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
    }
    .event-time .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.6);
    }
    .event-location {
        font-size: 0.82em;
        color: rgba(0, 0, 0, 0.7);
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }
    .event-location svg {
        width: 14px;
        height: 14px;
        opacity: 0.8;
    }
    .time-indicator {
        position: absolute;
        left: -2px;
        right: -2px;
        height: 2px;
        background: linear-gradient(90deg, rgba(255, 59, 48, 0.9), rgba(255, 59, 48, 0.7));
        box-shadow: 0 0 12px var(--cwc-time-line-glow);
        border-radius: 999px;
        z-index: 2;
        display: flex;
        align-items: center;
    }
    .time-indicator .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--cwc-time-line-color);
        border: 2px solid var(--cwc-time-line-dot-border);
        box-shadow: 0 0 12px var(--cwc-time-line-glow);
        margin-left: -4px;
    }
    .time-indicator .label {
        margin-left: 10px;
        font-size: 11px;
        font-weight: 700;
        color: var(--cwc-time-line-color);
        background: rgba(255, 255, 255, 0.9);
        padding: 2px 8px;
        border-radius: 999px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    }
    .empty-state {
        text-align: center;
        padding: 24px;
        color: var(--cwc-secondary-text);
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: center;
        justify-content: center;
    }
    .empty-state svg {
        width: 48px;
        height: 48px;
        opacity: 0.8;
    }
    .empty-state button {
        border: none;
        border-radius: 8px;
        padding: 10px 16px;
        cursor: pointer;
        font-weight: 600;
        color: var(--accent-color, #4287f5);
        background: var(--cwc-button-bg);
        transition: background 0.2s ease, transform 0.2s ease;
    }
    .empty-state button:hover {
        background: var(--cwc-button-bg-hover);
        transform: translateY(-1px);
    }
    @media (max-width: 768px) {
        :host {
            max-height: none;
        }
        .header-bar h3 {
            font-size: 1.1em;
        }
        .week-body {
            flex-direction: column;
        }
        .time-bar {
            width: 100%;
            height: 50px;
        }
        .week-grid {
            grid-template-columns: 1fr;
        }
        .week-header {
            grid-template-columns: repeat(7, 1fr);
        }
    }
    .dialog-overlay {
        position: fixed;
        inset: 0;
        background: var(--cwc-overlay);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 16px;
    }
    .dialog {
        width: min(780px, 100%);
        max-height: 90vh;
        background: var(--cwc-dialog-background);
        color: var(--cwc-dialog-text);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 22px 60px rgba(0, 0, 0, 0.25);
        display: grid;
        grid-template-columns: 1.3fr 1fr;
        border: 1px solid var(--cwc-border-color);
    }
    .dialog h2 {
        margin: 0;
        font-size: 1.2rem;
        letter-spacing: 0.01em;
    }
    .dialog-left {
        padding: 24px;
        background: linear-gradient(180deg, rgba(77, 150, 255, 0.06), rgba(77, 150, 255, 0));
        border-right: 1px solid var(--cwc-dialog-divider);
        display: flex;
        flex-direction: column;
        gap: 20px;
    }
    .dialog-right {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 18px;
        background: var(--cwc-dialog-background);
    }
    .dialog-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 14px;
        background: rgba(0, 0, 0, 0.02);
        border-radius: 12px;
        border: 1px solid var(--cwc-dialog-divider);
    }
    .dialog-section h3 {
        margin: 0;
        font-size: 1rem;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .dialog p {
        margin: 0;
        color: var(--cwc-dialog-muted);
        line-height: 1.5;
    }
    .calendar-color-picker {
        display: grid;
        grid-template-columns: 24px 1fr 38px;
        gap: 10px;
        align-items: center;
        padding: 10px 12px;
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.02);
        border: 1px solid var(--cwc-dialog-divider);
    }
    .calendar-color-picker .name {
        font-weight: 600;
        color: var(--cwc-dialog-text);
    }
    .calendar-color-picker small {
        color: var(--cwc-dialog-muted);
    }
    .color-picker {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        border: 1px solid var(--cwc-dialog-divider);
        cursor: pointer;
        background: var(--cwc-dialog-background);
    }
    .input-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    select {
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid var(--cwc-dialog-divider);
        background: var(--cwc-dialog-background);
        color: var(--cwc-dialog-text);
        font-size: 0.95rem;
    }
    .dialog-footer {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding-top: 6px;
        margin-top: auto;
        border-top: 1px solid var(--cwc-dialog-divider);
    }
    .dialog-footer p {
        margin: 0;
        color: var(--cwc-dialog-muted);
        font-size: 0.9rem;
    }
    .paypal-button {
        width: 100%;
        border: none;
        border-radius: 12px;
        padding: 12px 16px;
        background: linear-gradient(90deg, #009cde, #003087);
        color: white;
        font-weight: 700;
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .paypal-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    }
    .dialog-close {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: none;
        background: rgba(0, 0, 0, 0.06);
        color: inherit;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
    }
    .dialog-close:hover {
        background: rgba(0, 0, 0, 0.12);
    }
    .switch {
        position: relative;
        display: inline-block;
        width: 46px;
        height: 24px;
    }
    .switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }
    .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.25);
        transition: 0.2s;
        border-radius: 24px;
    }
    .slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 4px;
        bottom: 3px;
        background-color: white;
        transition: 0.2s;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    input:checked + .slider {
        background-color: var(--accent-color, #4D96FF);
    }
    input:checked + .slider:before {
        transform: translateX(20px);
    }
    .trim-hours {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 12px;
    }
    .trim-hours .texts {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .highlight-today {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 12px;
        border-radius: 12px;
    }
    .button-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
    }
    .button-row button {
        border: none;
        border-radius: 12px;
        padding: 10px 14px;
        cursor: pointer;
        font-weight: 600;
        color: var(--cwc-primary-text);
        background: rgba(0, 0, 0, 0.04);
        border: 1px solid var(--cwc-dialog-divider);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .button-row button:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
    }
    .dialog-footer button {
        align-self: flex-start;
    }
    .dialog-content {
        position: relative;
        display: contents;
    }
    .dialog-reset {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 12px;
        border-radius: 12px;
    }
    .dialog-reset .button-row {
        margin-top: 4px;
    }
    .backdrop {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: radial-gradient(circle at 20% 20%, rgba(77, 150, 255, 0.08), transparent 28%),
            radial-gradient(circle at 80% 20%, rgba(255, 178, 102, 0.08), transparent 28%),
            radial-gradient(circle at 50% 80%, rgba(120, 255, 214, 0.08), transparent 36%);
        filter: blur(14px);
        opacity: 0.9;
    }
    .dialog-left > * {
        position: relative;
        z-index: 1;
    }
    @media (max-width: 900px) {
        .dialog {
            grid-template-columns: 1fr;
            max-height: 95vh;
        }
        .dialog-left {
            border-right: none;
            border-bottom: 1px solid var(--cwc-dialog-divider);
        }
    }
    @media (max-width: 540px) {
        .dialog {
            max-height: 100vh;
            border-radius: 12px;
        }
        .dialog-close {
            top: 8px;
            right: 8px;
        }
        .dialog h2 {
            font-size: 1.05rem;
        }
        select {
            font-size: 0.9rem;
        }
    }
    .hidden { display: none !important; }
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
`;

export function createCardTemplate() {
    const dayColumns = [...Array(7)].map(() => `<div class="day-column"></div>`).join("");
    return `
        <style>
        ${CARD_STYLES}
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
                ${dayColumns}
            </div>
        </div>
        <div class="no-calendars-inline" hidden></div>
    `;
}

export const PICKER_STYLES = `
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
        gap: 10px;
        margin-top: 10px;
    }
    .calendar-option {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 10px;
        align-items: center;
        padding: 10px;
        border-radius: 10px;
        border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.1));
    }
    .calendar-option:hover {
        border-color: var(--accent-color, #4d96ff);
    }
    .calendar-option small {
        color: var(--secondary-text-color, #6b6b6b);
    }
    .placeholder {
        color: var(--secondary-text-color, #6b6b6b);
        text-align: center;
        padding: 12px 0;
    }
    .placeholder.error {
        color: #b00020;
    }
`;

export { CARD_STYLES };
