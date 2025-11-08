# Calendar Week Card

A Lovelace card that displays a weekly calendar grid with automatic entity discovery, configurable colors, dynamic zoom, and event dialogs.

## Usage

```yaml
type: custom:calendar-week-card
entities:
  - calendar.family
```

Colors can be customized from the card's settings dialog and are saved locally per browser. The same dialog also lets you enable the dynamic zoom that hides unused early/late hours and set how many hours may be removed from the view.
