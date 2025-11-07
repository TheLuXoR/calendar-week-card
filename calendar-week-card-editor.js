class CalendarWeekCardEditor extends HTMLElement {
    set hass(hass) {
        this._hass = hass;
        if (!this.content) {
            this.render();
        }
    }

    setConfig(config) {
        this.config = config || {};
    }

    render() {
        this.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px; padding: 8px;">
        <label>
          Title:
          <input type="text" id="title" value="${this.config.title || ""}">
        </label>
        <label>
          Entities (comma separated):
          <input type="text" id="entities" value="${(this.config.entities || []).join(',')}">
        </label>
        <div id="color-pickers" style="display: flex; flex-direction: column; gap: 4px;"></div>
      </div>
    `;

        this.updateColorPickers();

        this.querySelector("#title").addEventListener("input", e => {
            this.config.title = e.target.value;
            this.fireConfigChanged();
        });

        this.querySelector("#entities").addEventListener("change", e => {
            this.config.entities = e.target.value.split(",").map(s => s.trim());
            this.updateColorPickers();
            this.fireConfigChanged();
        });
    }

    updateColorPickers() {
        const container = this.querySelector("#color-pickers");
        container.innerHTML = "";
        if (!this.config.entities) return;

        for (const entity of this.config.entities) {
            const div = document.createElement("div");
            div.style.display = "flex";
            div.style.alignItems = "center";
            div.style.gap = "4px";

            const label = document.createElement("span");
            label.textContent = entity;

            const input = document.createElement("input");
            input.type = "color";
            input.value = (this.config.colors && this.config.colors[entity]) || "#4287f5";
            input.addEventListener("input", e => {
                if (!this.config.colors) this.config.colors = {};
                this.config.colors[entity] = e.target.value;
                this.fireConfigChanged();
            });

            div.appendChild(label);
            div.appendChild(input);
            container.appendChild(div);
        }
    }

    fireConfigChanged() {
        this.dispatchEvent(
            new CustomEvent("config-changed", {
                detail: {config: this.config},
                bubbles: true,
                composed: true
            })
        );
    }
}

customElements.define("calendar-week-card-editor", CalendarWeekCardEditor);
