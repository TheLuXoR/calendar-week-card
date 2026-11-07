# Calendar Week Card

A Lovelace card that displays a weekly calendar grid with automatic entity discovery, configurable colors, language selection, and event dialogs.

## Usage
### prerequisit
to show calendar events home assistant needs to be configured to know your calendars
for example with: https://www.home-assistant.io/integrations/google/

```yaml
type: custom:calendar-week-card
entities:
  - calendar.family
```

### minimal setup with auto detection
```yaml
type: custom:calendar-week-card
```

Colors and visibility can be adjusted from the in-card settings dialog and are saved per browser profile.

## configuration options

All values that can be changed in the settings dialog can also be defined in YAML. This allows you to ship a card configuration with predefined colors, visibility, and behavior:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | string | – | Optional title shown above the navigation controls. |
| `entities` | list | auto-discover | Calendars to display. Leave empty to auto-detect. |
| `colors` | map | generated | Map of entity IDs to colors. YAML values override dialog choices. |
| `hidden_entities` | list | `[]` | Calendars that should start hidden. Overrides stored visibility. |
| `language` | string | `system` | Language for labels (`system` or a supported language code). |
| `theme` | string | `system` | Force `light`, `dark`, or `system` theme. |
| `view_mode` | string | `week` | Use `week` for the current Monday–Sunday week or `rolling` to start with today. |
| `days_to_show` | integer | `7` | Number of days displayed in rolling mode, from 3 to 10. |
| `height` | CSS length | parent height | Optional height for non-panel layouts, such as `500px`, `70vh`, or `calc(100vh - 64px)`. |
| `trim_unused_hours` | boolean | `false` | Collapse empty time ranges when `true`. |
| `highlight_today` | boolean | `true` | Enable or disable the today highlight. |
| `today_highlight_color` | string | `#4D96FF` | Override the color of the today highlight. |

Example:

```yaml
type: custom:calendar-week-card
language: fr
theme: light
view_mode: rolling
days_to_show: 7
trim_unused_hours: true
today_highlight_color: '#3a7bff'
hidden_entities:
  - calendar.travel
colors:
  calendar.family: '#ff9f1c'
```

When the card is inside a stack or another content-sized layout, give the timeline an explicit height without `card_mod`:

```yaml
type: vertical-stack
cards:
  - type: custom:calendar-week-card
    height: 500px
```

Leave `height` unset in panel mode to keep parent-controlled sizing.
