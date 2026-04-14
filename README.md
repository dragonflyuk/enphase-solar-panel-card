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
  - power_entity: sensor.envoy_123456_microinverter_111111
    energy_entity: sensor.solar_daily_111111    # optional
    name: "Roof W1"
  - power_entity: sensor.envoy_123456_microinverter_222222
    name: "Roof W2"
  - power_entity: sensor.envoy_123456_microinverter_333333
    energy_entity: sensor.solar_daily_333333
    name: "Roof E1"
```

### Options

| Key | Required | Default | Description |
|---|---|---|---|
| `inverters` | yes | — | Ordered list of microinverter definitions |
| `inverters[].power_entity` | yes | — | Entity ID for current power (W) |
| `inverters[].energy_entity` | no | — | Entity ID for daily energy (kWh) |
| `inverters[].name` | no | `Panel N` | Label shown above the tile |
| `title` | no | `Solar Panels` | Card heading (`""` to hide) |
| `max_power` | no | `300` | Rated max W per inverter, used for colour scaling |

### Finding your entity IDs

The **Enphase Envoy** integration names microinverter entities like:

```
sensor.envoy_<ENVOY_SERIAL>_microinverter_<INVERTER_SERIAL>
```

Go to **Settings → Devices & Services → Enphase Envoy → Entities** and filter by your inverter serial numbers.

### Setting up daily energy entities

The Envoy integration exposes **power** (W) per microinverter, not energy.  
To get a daily kWh figure for each panel:

1. **Riemann Sum Integral** helper (Settings → Helpers → Add → Riemann Sum Integral)
   - Input sensor: `sensor.envoy_XXXX_microinverter_YYYY`
   - Unit prefix: `k` (kilo), Time unit: `h` (hours), Method: Left or Trapezoidal
   - This gives a cumulative kWh sensor.

2. **Utility Meter** helper on top of that
   - Source: the Riemann Sum sensor from step 1
   - Cycle: **Daily**
   - This resets to 0 each midnight.

Use the resulting utility meter entity as `energy_entity`.

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
