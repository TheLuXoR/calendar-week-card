class CalendarWeekCard extends HTMLElement {
    constructor() {
        super();
        this.weekOffset = 0;
        this.lastEvents = [];
        this.dynamicEntities = [];
        this.availableCalendars = [];
    }

    setConfig(config) {
        this.config = structuredClone(config) || {};
        this.config.colors = this.config.colors || {};
        this.dynamicEntities = [];
        this.availableCalendars = [];
        this._entitiesPromise = undefined;

        // Load saved colors
        const savedColors = localStorage.getItem("calendar-week-card-colors");
        if (savedColors) {
            this.config.colors = { ...this.config.colors, ...JSON.parse(savedColors) };
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
            .week-body { flex: 1; display: flex; width: 100%; height: 100%; border: 1px solid #ccc; overflow: hidden; }
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
        this.pixelsPerMinute = gridHeight / (24 * 60);
        this.timeBar.innerHTML = "";
        for (let h = 1; h <= 23; h++) {
            const label = document.createElement("div");
            label.className = "hour-label";
            label.textContent = `${h.toString().padStart(2, '0')}:00`;
            label.style.top = `${h * 60 * this.pixelsPerMinute}px`;
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
            line.style.top = `${minutes * this.pixelsPerMinute}px`;
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
        if (!entities.length) {
            this.renderList([]);
            return;
        }

        const [start, end] = this.getWeekRange();
        let allEvents = [];

        for (const entity of entities) {
            try {
                const url = `calendars/${entity}?start=${start.toISOString()}&end=${end.toISOString()}`;
                const events = await hass.callApi("get", url);
                events.forEach(ev => {
                    allEvents.push({
                        calendar: entity,
                        title: ev.summary || "(no title)",
                        start: new Date(ev.start.dateTime || ev.start.date),
                        end: new Date(ev.end.dateTime || ev.end.date),
                        color: ev.color
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
        this.dayColumns.forEach(col => col.innerHTML = "");

        const [startOfWeek] = this.getWeekRange();

        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            // Get all events for this day, sorted by start time
            const dayEvents = events
                .filter(ev => {
                    const evDayOffset = Math.floor((ev.start - startOfWeek) / (1000 * 60 * 60 * 24));
                    return evDayOffset === dayOffset;
                })
                .sort((a, b) => a.start - b.start);

            const activeStack = []; // currently overlapping events

            for (const ev of dayEvents) {
                // Remove ended events from the stack
                for (let i = activeStack.length - 1; i >= 0; i--) {
                    if (activeStack[i].end <= ev.start) activeStack.splice(i, 1);
                }

                // Determine max column among overlapping events
                let maxCol = -1;
                activeStack.forEach(e => { if (e.column > maxCol) maxCol = e.column; });
                ev.column = maxCol + 1;

                // Add current event to stack
                activeStack.push(ev);

                const startMinutes = ev.start.getHours() * 60 + ev.start.getMinutes();
                const endMinutes = ev.end.getHours() * 60 + ev.end.getMinutes();
                const top = startMinutes * this.pixelsPerMinute;
                const height = Math.max(endMinutes - startMinutes, 15) * this.pixelsPerMinute;

                const leftIndent = 2 + ev.column * 12;   // main left offset
                const rightIndent = 2 + ev.column * 2;   // subtle right offset

                const eventDiv = document.createElement("div");
                eventDiv.className = "event";
                eventDiv.style.top = `${top}px`;
                eventDiv.style.height = `${height}px`;
                eventDiv.style.left = `${leftIndent}px`;
                eventDiv.style.right = `${rightIndent}px`;
                eventDiv.style.backgroundColor = this.config.colors[ev.calendar] || ev.color || "#4287f5";
                eventDiv.style.boxShadow = "0 2px 6px rgba(0,0,0,0.9)";

                const startStr = ev.start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                const endStr = ev.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                eventDiv.innerHTML = `<div><b>${ev.title}</b></div><div style="font-size:10px;opacity:0.9;">${startStr} – ${endStr}</div>`;

                eventDiv.addEventListener("click", () => this.showEventDialog(ev));

                this.dayColumns[dayOffset].appendChild(eventDiv);
            }
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
        line.style.top = `${minutes * this.pixelsPerMinute}px`;
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
        title.textContent = "Calendar Colors";
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

            const label = document.createElement("span");
            label.textContent = this.getCalendarName(entity);
            label.style.flex = "1";
            label.style.fontWeight = "500";
            label.style.color = "#555";

            const picker = document.createElement("input");
            picker.type = "color";
            picker.value = this.config.colors[entity] || "#4287f5";
            picker.style.width = "40px";
            picker.style.height = "30px";
            picker.style.border = "none";
            picker.style.borderRadius = "0px";
            picker.style.cursor = "pointer";
            picker.addEventListener("input", e => {
                this.config.colors[entity] = e.target.value;
                localStorage.setItem("calendar-week-card-colors", JSON.stringify(this.config.colors));
                this.renderList(this.lastEvents);
            });

            row.appendChild(label);
            row.appendChild(picker);
            list.appendChild(row);
        });

        content.appendChild(list);

        const donateSection = document.createElement("div");
        Object.assign(donateSection.style, {
            marginTop: "8px",
            display: "flex",
            justifyContent: "center"
        });

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

        const startDate = ev.start.toLocaleString(undefined, {weekday: "long", year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit"});
        const endDate = ev.end.toLocaleString(undefined, {weekday: "long", year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit"});

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