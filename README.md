# Calendar Week Card

A custom Lovelace card that renders a week-based calendar view in Home Assistant. It automatically loads calendar entities, lets you assign persistent colors per calendar, and provides dialogs for reviewing events.

## Features

- Weekly grid layout with current time indicator
- Automatic calendar discovery with optional manual entity list
- Persistent color picker for each calendar
- Event detail dialog with start/end information

## Installation

### HACS (recommended)

1. Ensure you are running Home Assistant 2023.5 or newer.
2. In HACS, add this repository as a custom repository (type: `Lovelace`).
3. Install **Calendar Week Card** from the custom repositories list.
4. Reload your Lovelace resources or restart Home Assistant if prompted.

### Manual installation

1. Copy `calendar-week-card.js` into `<config>/www/community/calendar-week-card/`.
2. Add the resource to Home Assistant:
   ```yaml
   url: /hacsfiles/calendar-week-card/calendar-week-card.js
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
- `entities` (optional): Explicit list of calendar entities. When omitted, the card will display all available calendars.
- `colors` (optional): Map of entity IDs to hex color values. Values can be adjusted from the built-in settings dialog.

## Support the project

If this card saves you time, please consider supporting the development with a small donation.

[![Donate with PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif)](https://www.paypal.com/donate/?hosted_button_id=ABUTP5VLEUBS4)

## Development

The card is a single JavaScript module. To contribute, edit `calendar-week-card.js` and open a pull request.

## License

This project is released under the MIT License.
