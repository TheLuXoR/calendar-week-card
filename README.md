# Calendar Week Card

A modern Lovelace card that renders a weekly calendar grid for Home Assistant. The card discovers your calendars automatically, lets you assign persistent colors per entity, and provides rich dialogs for inspecting events.

## Features

- Weekly grid layout with current time indicator
- Automatic calendar discovery with optional manual entity list
- Persistent calendar colors with built-in picker
- Event detail dialogs with location and description
- Multilingual interface with browser or user-selected language

## Installation

### HACS (recommended)

1. Ensure you are running Home Assistant 2023.5 or newer.
2. In HACS, add this repository as a custom repository of type **Lovelace**.
3. Install **Calendar Week Card** from the custom repositories list.
4. After installation, reload your Lovelace resources or restart Home Assistant if prompted.

### Manual installation

1. Download the latest release assets and copy `dist/calendar-week-card.js` (and the optional `calendar-week-card.js` compatibility stub) into `<config>/www/community/calendar-week-card/`.
2. Add the resource to Home Assistant:
   ```yaml
   url: /hacsfiles/calendar-week-card/dist/calendar-week-card.js
   type: module
   ```
3. Reload the Lovelace dashboard.

## Lovelace configuration

```yaml
type: custom:calendar-week-card
title: Family calendar
entities:
  - calendar.family
  - calendar.work
colors:
  calendar.family: "#6BCB77"
  calendar.work: "#4D96FF"
```

- `title` (optional): Override the header text.
- `entities` (optional): Explicit list of calendar entities. When omitted, all available calendars are shown.
- `colors` (optional): Map of entity IDs to hex color values. Values can also be adjusted from the card's settings dialog.

## Development

This repository uses a small build script to generate the distributable bundle in `dist/`:

```bash
npm run build
```

The command concatenates the source modules under `src/` into `dist/calendar-week-card.js`. Re-run it whenever you change the source files before creating a release.

## Support the project

If this card saves you time, please consider supporting the development with a small donation.

[![Donate with PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/donate/?hosted_button_id=ABUTP5VLEUBS4)

## License

This project is released under the MIT License.
