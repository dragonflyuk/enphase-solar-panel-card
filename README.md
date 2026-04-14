# Enphase Solar Panel Card

A Home Assistant Lovelace custom card that displays each Enphase microinverter as a portrait solar panel tile in a horizontal row, showing current power output and optional daily energy totals.

![screenshot placeholder](https://raw.githubusercontent.com/YOUR_USERNAME/enphase-solar-panel-card/main/screenshot.png)

## Features

- Portrait solar panel tiles arranged in a horizontal scrollable row
- Per-panel current power (W) with colour-coded glow (amber → lime → green)
- Optional per-panel daily energy (kWh)
- Shimmer animation when a panel is producing
- Configurable panel selection and display order
- Click any panel to open the HA more-info dialog for that entity
- Respects HA theme CSS variables

## Installation

### HACS (recommended)

1. In HACS → Frontend, click **+ Explore & download repositories**
2. Search for **Enphase Solar Panel Card** and install
3. Refresh your browser

### Manual

1. Copy `enphase-solar-panel-card.js` to `/config/www/`
2. In HA → **Settings → Dashboards → Resources**, add:
   - URL: `/local/enphase-solar-panel-card.js`
   - Type: **JavaScript Module**
3. Refresh your browser

## Configuration

```yaml
type: custom:enphase-solar-panel-card
title: Solar Array        # optional card title (set to "" to hide)
max_power: 300            # optional: max W per inverter for colour scaling (default 300)
inverters:
  - power_entity: sensor.inverter_122345007737_watts
    energy_entity: sensor.inverter_122345007737_today_s_energy_production
    name: "Roof W1"
  - power_entity: sensor.inverter_122345007738_watts
    energy_entity: sensor.inverter_122345007738_today_s_energy_production
    name: "Roof W2"
  - power_entity: sensor.inverter_122345007739_watts
    energy_entity: sensor.inverter_122345007739_today_s_energy_production
    name: "Roof E1"
```

### Options

| Key | Required | Default | Description |
|---|---|---|---|
| `inverters` | yes | — | Ordered list of microinverter definitions |
| `inverters[].power_entity` | yes | — | Entity ID for current power (W) |
| `inverters[].energy_entity` | no | — | Entity ID for today's energy (Wh or kWh — unit read automatically) |
| `inverters[].name` | no | `Panel N` | Label shown above the tile |
| `title` | no | `Solar Panels` | Card heading (`""` to hide) |
| `max_power` | no | `300` | Rated max W per inverter, used for colour scaling |

### Finding your entity IDs

The **Enphase Envoy** integration creates two entities per microinverter,
named after the inverter's serial number:

| Entity | Pattern | Unit |
|---|---|---|
| Current power | `sensor.inverter_<SERIAL>_watts` | W |
| Today's energy | `sensor.inverter_<SERIAL>_today_s_energy_production` | Wh |

Go to **Settings → Devices & Services → Enphase Envoy → Entities**, filter by
serial number, or search for `today_s_energy_production` to list all daily
energy sensors at once.

## Colour coding

| Colour | Meaning |
|---|---|
| Grey | Not producing / unavailable |
| Amber | < 15 % of rated power |
| Lime | 15 – 45 % |
| Green | 45 – 75 % |
| Bright green | > 75 % (near peak) |

## License

MIT
