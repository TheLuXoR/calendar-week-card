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
#### comming soon
- `colors` (optional): Map of entity IDs to hex color values. Values can also be adjusted from the card's settings dialog.

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