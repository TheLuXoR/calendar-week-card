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
