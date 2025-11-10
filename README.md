# Calendar Week Card
[![hacs][hacs-img]][hacs-url] 
[![GitHub Release][github-release-img]][github-release-url] 
[![Downloads][github-downloads-img]][github-release-url] 
[![Downloads@latest][github-latest-downloads-img]][github-release-url]

A a fully customizable Lovelace card that renders a weekly calendar grid for Home Assistant. The card discovers your calendars automatically and you can assign your preferred colors per calendar or change the main theme entirely.

### how it could look:
<img src="https://raw.githubusercontent.com/TheLuXoR/calendar-week-card/main/img/img_2.png" alt="drawing" width="200"/>
<img src="https://raw.githubusercontent.com/TheLuXoR/calendar-week-card/main/img/img_4.png" alt="drawing" width="200"/>

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
2. In HACS, add this repository as a custom repository of type **Lovelace**.
3. Install **Calendar Week Card** from the custom repositories list.
4. After installation, reload your Lovelace resources or restart Home Assistant if prompted.

### Manual installation

1. Add https://github.com/TheLuXoR/calendar-week-card to your custom HACS repositories
2. Search for "Calendar Week Card"
3. Download the latest release

## usage
currently the calendar card is meant to be used as a panel view.
#### how to do a panel view?
<details>

1. add a new dashboard
2. open the dashboard and open its settings
3. adjust it to Panel<br><img src="https://raw.githubusercontent.com/TheLuXoR/calendar-week-card/main/img/img_5.png" alt="drawing" width="300"/>
</details>

##### currently this is only tested as panel view

### Minimal setup
```yaml
type: custom:calendar-week-card
```

### manual setup with predefined Calendars
```yaml
type: custom:calendar-week-card
title: Family calendar
entities:
  - calendar.family
  - calendar.work
```

- `title` (optional): Override the header text.
- `entities` (optional): Explicit list of calendar entities. When omitted, all available calendars are shown.

### configuration options

Every option that is available in the in-card settings dialog can also be controlled from YAML. This makes it easy to keep multiple dashboards consistent or to share a predefined look and feel with other users.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | string | – | Optional title shown in the header bar. |
| `entities` | list | auto-discover | Calendars to display. When omitted the card queries Home Assistant for all available calendars. |
| `colors` | map | generated | Map of `calendar.entity_id` → color. Colors accept hex values or any CSS color string. Values defined here override colors chosen in the dialog. |
| `hidden_entities` | list | `[]` | Calendars that should start hidden. When provided, this list takes precedence over any per-browser visibility stored from the dialog. |
| `language` | string | `system` | Locale used for all labels. Use `system` or one of the supported language codes (see `src/localization.js`). |
| `theme` | string | `system` | Force the light or dark theme (`light`, `dark`, or `system`). YAML values override the per-browser theme preference. |
| `trim_unused_hours` | boolean | `false` | When `true`, collapses empty time slots outside the hours that contain events. |
| `highlight_today` | boolean | `true` | Toggle the highlight around the current day column. |
| `today_highlight_color` | string | `#4D96FF` | Color used for the “today” highlight. Accepts hex or CSS color strings. YAML value wins over any color picked in the dialog. |

Example with custom options:

```yaml
type: custom:calendar-week-card
title: Team Schedule
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


## Support the project

you like it? you could support me =)</br>
[![Donate with PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/donate/?hosted_button_id=ABUTP5VLEUBS4)

## License

This project is released under the MIT License.

[hacs-img]: https://img.shields.io/badge/HACS-Custom-orange.svg
[hacs-url]: https://github.com/TheLuXoR/calendar-week-card/actions/workflows/release.yml
[github-release-img]: https://img.shields.io/github/release/TheLuXoR/calendar-week-card.svg
[github-downloads-img]: https://img.shields.io/github/downloads/TheLuXoR/calendar-week-card/total.svg
[github-latest-downloads-img]: https://img.shields.io/github/downloads/TheLuXoR/calendar-week-card/latest/total.svg
[github-release-url]: https://github.com/TheLuXoR/calendar-week-card/releases