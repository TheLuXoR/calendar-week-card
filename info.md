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
| `trim_unused_hours` | boolean | `false` | Collapse empty time ranges when `true`. |
| `highlight_today` | boolean | `true` | Enable or disable the today highlight. |
| `today_highlight_color` | string | `#4D96FF` | Override the color of the today highlight. |

Example:

```yaml
type: custom:calendar-week-card
language: fr
theme: light
trim_unused_hours: true
today_highlight_color: '#3a7bff'
hidden_entities:
  - calendar.travel
colors:
  calendar.family: '#ff9f1c'
```
