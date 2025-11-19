# Calendar Week Card
[![hacs][hacs-img]][hacs-url] 
[![GitHub Release][github-release-img]][github-release-url] 
[![Downloads][github-downloads-img]][github-release-url] 
[![Downloads@latest][github-latest-downloads-img]][github-release-url]


<img src="https://raw.githubusercontent.com/TheLuXoR/calendar-week-card/main/img/img_2.png" alt="drawing" width="300"/>
<img src="https://raw.githubusercontent.com/TheLuXoR/calendar-week-card/main/img/img_4.png" alt="drawing" width="300"/>

A fully customizable Lovelace card that displays your week at a glance in a clean, structured grid. It automatically finds all calendars available in Home Assistant, but you can also choose specific ones if you prefer. Each calendar can have its own color, and you can tweak the entire theme to match your setup.

## Getting started

1. **Register your calendars in Home Assistant.** The card cannot show events that Home Assistant does not know about (see the next section for details).
2. **Install the card** via HACS or by copying the release file manually.
3. **Add it from the Lovelace card picker** or define it in YAML (examples below). The card comes with an in-card settings dialog so you can finish the setup without leaving the dashboard.

Once the card is on a dashboard you can open the settings dialog (⋮ menu → **Configure**) to pick languages, themes, colors, hidden calendars, and layout options without editing YAML.

## Register calendars in Home Assistant

The card can only display entities that Home Assistant already knows about. If the calendar picker in the settings dialog looks empty, first make sure at least one calendar is configured in Home Assistant:

1. Open **Settings → Devices & Services → Integrations** in Home Assistant.
2. Click **Add Integration** and search for a calendar source such as **Local Calendar**, **Google Calendar**, or another provider you use.
3. Follow the on-screen prompts for the chosen integration and complete the authentication/authorization flow.
4. When the integration finishes, confirm that a `calendar.*` entity appears under **Settings → Devices & Services → Entities**. That entity will now be auto-discovered by the Calendar Week Card (or you can list it manually via the `entities` option).

Once at least one calendar entity exists, the card can discover it automatically or you can explicitly list the entities you want to show.

## Features
- Weekly grid layout with current time indicator
- Automatic calendar discovery with optional manual entity list
- Persistent calendar colors with built-in color picker
- Event details dialog
- Multilingual interface with browser or user-selected language


<img src="https://raw.githubusercontent.com/TheLuXoR/calendar-week-card/main/img/img_3.png" alt="drawing" width="200"/>

### Settings dialog
<img src="https://raw.githubusercontent.com/TheLuXoR/calendar-week-card/main/img/img.png" alt="drawing" width="200"/>
<img src="https://raw.githubusercontent.com/TheLuXoR/calendar-week-card/main/img/img_1.png" alt="drawing" width="200"/><br/>


## Installation
### HACS (recommended)

1. Ensure you are running Home Assistant 2023.5 or newer.
2. Open **HACS → Frontend**, search for **Calendar Week Card**, and install it.
3. HACS will register the resource automatically; reload your dashboard resources or restart Home Assistant if prompted.

### Manual installation

1. Download the latest release from [GitHub](https://github.com/TheLuXoR/calendar-week-card/releases).
2. Copy `calendar-week-card.js` into your `config/www` folder (or another location served by Home Assistant).
3. Add a Lovelace resource that points to the copied file, for example:
   ```yaml
   url: /local/calendar-week-card.js
   type: module
   ```

## Usage

### Add it from the Lovelace card picker

The card registers itself with the Home Assistant card picker, so it can be added like any built-in card:

1. Open a dashboard, click **Edit dashboard**, and then **Add card**.
2. Search for **Calendar Week Card** (look under the **Custom** section).
3. Use the picker preview to select the language and toggle which calendars should appear. The picker fetches available calendars from Home Assistant, so you can confirm everything works before saving.
4. Click **Save**. The card is now live, and you can always reopen the in-card settings dialog to adjust colors, themes, visibility, and trimming.

### Use the picker card on a dashboard

If you prefer to keep a visual configuration helper on a dedicated admin dashboard, you can add the picker as its own card. It exposes the same controls as the Add Card dialog and writes the resulting configuration back to Lovelace:

```yaml
type: custom:calendar-week-card-picker
```

Place it temporarily next to your calendar card, toggle languages or calendar visibility, and then copy/export the generated YAML when you are happy with the selection.

### Panel view layout

The calendar looks best when it gets the full dashboard width. To turn a dashboard into a panel view:

<details>
<summary>Steps for panel view</summary>

1. Add or open the dashboard that should host the calendar.
2. Click the three-dot menu → **Edit dashboard** → **More options**.
3. Enable **Panel mode**. The dashboard will now show a single card stretched to the full width.<br><img src="https://raw.githubusercontent.com/TheLuXoR/calendar-week-card/main/img/img_5.png" alt="drawing" width="300"/>

</details>

### Minimal setup

```yaml
type: custom:calendar-week-card
```

With this configuration the card discovers all available calendars and starts with default colors. You can customize everything later through the settings dialog.

### Configurable setup

Every option that is available in the in-card settings dialog can also be controlled from YAML. This makes it easy to keep multiple dashboards consistent or to share a predefined look and feel with other users.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `entities` | list | auto-discover | Calendars to display. When omitted the card queries Home Assistant for all available calendars. |
| `colors` | map | generated | Map of `calendar.entity_id` → color. Colors accept hex values or any CSS color string. Values defined here override colors chosen in the dialog. |
| `hidden_entities` | list | `[]` | Calendars that should start hidden. When provided, this list takes precedence over any per-browser visibility stored from the dialog. |
| `language` | string | `system` | Locale used for all labels. Use `system` or one of the supported language codes (see `src/localization.js`). |
| `theme` | string | `system` | Force the light or dark theme (`light`, `dark`, or `system`). YAML values override the per-browser theme preference. |
| `trim_unused_hours` | boolean | `false` | When `true`, collapses empty time slots outside the hours that contain events. |
| `highlight_today` | boolean | `true` | Toggle the highlight around the current day column. |
| `today_highlight_color` | string | `#4D96FF` | Color used for the “today” highlight. Accepts hex or CSS color strings. YAML value wins over any color picked in the dialog. |

#### Example with custom options:

```yaml
type: custom:calendar-week-card
language: de
theme: dark
trim_unused_hours: true
highlight_today: true
today_highlight_color: '#3366ff'
entities:
  - calendar.team
  - calendar.holidays
colors:
  calendar.team: '#6bcf7d'
hidden_entities:
  - calendar.holidays
```

## Development

This repository uses a small build script to generate the necessary output files:

```bash
npm run build
```


## you like it?

<div style="
  display:flex;
  margin-top:12px;
">
  <a href="https://www.paypal.com/donate/?hosted_button_id=ABUTP5VLEUBS4"
     target="_blank"
     style="
        background: linear-gradient(120deg, #F9D423, #FFCF00);
        color: #ffffff;
        padding: 10px 18px;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 600;
        font-size: 1em;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        cursor: pointer;
        box-shadow: 0 6px 16px rgba(0,0,0,0.25);
        transition: transform .15s ease, box-shadow .25s ease, filter .2s ease;
     "
     onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 16px rgba(0,0,0,0.35)';"
     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 6px 16px rgba(0,0,0,0.25)';"
  >
    💛 Support 💛
  </a>
</div>

## Translation

Translation was done by ChatGPT. You see some flaws I should fix? just open an issue in my Repository.


## License

This project is released under the MIT License.

[hacs-img]: https://img.shields.io/badge/HACS-Custom-orange.svg
[hacs-url]: https://github.com/TheLuXoR/calendar-week-card/actions/workflows/release.yml
[github-release-img]: https://img.shields.io/github/release/TheLuXoR/calendar-week-card.svg
[github-downloads-img]: https://img.shields.io/github/downloads/TheLuXoR/calendar-week-card/total.svg
[github-latest-downloads-img]: https://img.shields.io/github/downloads/TheLuXoR/calendar-week-card/latest/total.svg
[github-release-url]: https://github.com/TheLuXoR/calendar-week-card/releases