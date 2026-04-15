/**
 * Enphase Solar Panel Card for Home Assistant
 * https://github.com/YOUR_USERNAME/enphase-solar-panel-card
 *
 * Displays each Enphase microinverter as a portrait solar panel tile
 * in a horizontal scrollable row, with current power (W) and optional
 * daily energy (Wh / kWh) per panel.
 *
 * HACS / Manual installation:
 *   Copy this file to /config/www/enphase-solar-panel-card.js
 *   Add as a Lovelace resource: /local/enphase-solar-panel-card.js (JavaScript Module)
 *
 * Card YAML example:
 *   type: custom:enphase-solar-panel-card
 *   title: Solar Array
 *   max_power: 300
 *   panel_justify: center   # left (default) | center | right
 *   inverters:
 *     - power_entity: sensor.inverter_122345007737_watts
 *       energy_entity: sensor.inverter_122345007737_today_s_energy_production
 *       name: "W1"
 *     - power_entity: sensor.inverter_122345007738_watts
 *       energy_entity: sensor.inverter_122345007738_today_s_energy_production
 *       name: "W2"
 *
 * Entity naming (Enphase Envoy integration):
 *   Power (W) : sensor.inverter_<SERIAL>_watts
 *   Daily (Wh): sensor.inverter_<SERIAL>_today_s_energy_production
 *   Find your serial numbers under Settings → Devices & Services → Enphase Envoy.
 */

const CARD_VERSION = '1.0.0';

class EnphaseSolarPanelCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._initialized = false;
  }

  // ── Config ─────────────────────────────────────────────────────────────────

  setConfig(config) {
    if (!config.inverters || !Array.isArray(config.inverters) || config.inverters.length === 0) {
      throw new Error('enphase-solar-panel-card: define at least one entry in the inverters array');
    }
    config.inverters.forEach((inv, i) => {
      if (!inv.power_entity) {
        throw new Error(`enphase-solar-panel-card: inverters[${i}] must have a power_entity`);
      }
    });
    if (config.panel_justify && !['left', 'center', 'right'].includes(config.panel_justify)) {
      throw new Error('enphase-solar-panel-card: panel_justify must be left, center, or right');
    }
    this.config = config;
    this._initialized = false;
  }

  // ── Hass ───────────────────────────────────────────────────────────────────

  set hass(hass) {
    this._hass = hass;
    if (!this.config) return;
    if (!this._initialized) {
      this._buildSkeleton();
      this._initialized = true;
    }
    this._updateValues();
  }

  // ── Build static DOM once ──────────────────────────────────────────────────

  _buildSkeleton() {
    const cfg = this.config;
    const title = cfg.title || '';

    const panelHTML = cfg.inverters.map((inv, i) => {
      const name = inv.name || '';
      const cells = Array(12).fill('<div class="cell"></div>').join('');
      return `
        <div class="panel-tile" data-idx="${i}" data-entity="${inv.power_entity}">
          ${name ? `<div class="panel-name">${name}</div>` : ''}
          <div class="solar-panel">
            <div class="frame-top"></div>
            <div class="panel-body">
              <div class="panel-grid">${cells}</div>
              <div class="shine"></div>
            </div>
            <div class="frame-bottom"></div>
          </div>
          <div class="panel-stats">
            <div class="power" data-stat="power">—<span class="unit"> W</span></div>
            <div class="energy${inv.energy_entity ? '' : ' hidden'}" data-stat="energy">—<span class="unit"> Wh</span></div>
          </div>
        </div>`;
    }).join('');

    const justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
    const justifyContent = justifyMap[cfg.panel_justify] || 'flex-start';

    this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <div class="card">
        ${title ? `<div class="card-title">${title}</div>` : ''}
        <div class="panels-row" style="justify-content:${justifyContent}">${panelHTML}</div>
      </div>`;

    // Click → more-info dialog
    this.shadowRoot.querySelectorAll('.panel-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const entity = tile.dataset.entity;
        if (entity && this._hass) {
          this.dispatchEvent(new CustomEvent('hass-more-info', {
            detail: { entityId: entity },
            bubbles: true,
            composed: true,
          }));
        }
      });
    });
  }

  // ── Update numbers and colours without rebuilding DOM ─────────────────────

  _updateValues() {
    const hass = this._hass;
    const maxW = parseFloat(this.config.max_power) || 300;

    this.config.inverters.forEach((inv, i) => {
      const tile = this.shadowRoot.querySelector(`.panel-tile[data-idx="${i}"]`);
      if (!tile) return;

      // Power
      let watts = 0;
      const pState = hass.states[inv.power_entity];
      const available = pState && pState.state !== 'unavailable' && pState.state !== 'unknown';
      if (available) {
        watts = parseFloat(pState.state) || 0;
      }

      // Energy (optional) — read value and unit directly from the entity
      let energyValue = null;
      let energyUnit = 'Wh';
      if (inv.energy_entity) {
        const eState = hass.states[inv.energy_entity];
        if (eState && eState.state !== 'unavailable' && eState.state !== 'unknown') {
          energyValue = parseFloat(eState.state);
          energyUnit = (eState.attributes && eState.attributes.unit_of_measurement) || 'Wh';
        }
      }

      const producing = watts > 0;
      const color = this._powerColor(watts, maxW);

      tile.classList.toggle('producing', producing);
      tile.classList.toggle('unavailable', !available);
      tile.style.setProperty('--pc', color);

      const powerEl = tile.querySelector('[data-stat="power"]');
      if (powerEl) {
        powerEl.innerHTML = `${watts > 0 ? Math.round(watts) : '0'}<span class="unit"> W</span>`;
      }

      const energyEl = tile.querySelector('[data-stat="energy"]');
      if (energyEl && inv.energy_entity) {
        if (energyValue !== null) {
          // Show as kWh if the unit is Wh and the value is large enough to read nicely
          const displayWh = energyUnit === 'Wh' || energyUnit === 'wh';
          const displayVal = displayWh
            ? (energyValue >= 1000
                ? `${(energyValue / 1000).toFixed(2)}<span class="unit"> kWh</span>`
                : `${Math.round(energyValue)}<span class="unit"> Wh</span>`)
            : `${energyValue.toFixed(2)}<span class="unit"> ${energyUnit}</span>`;
          energyEl.innerHTML = displayVal;
        } else {
          energyEl.innerHTML = `—<span class="unit"> Wh</span>`;
        }
      }
    });
  }

  // ── Colour ramp  grey → amber → lime → green ──────────────────────────────

  _powerColor(watts, maxW) {
    if (watts <= 0) return '#555e6c';
    const ratio = Math.min(watts / maxW, 1);
    if (ratio < 0.15) return '#f59e0b'; // amber  – barely producing
    if (ratio < 0.45) return '#84cc16'; // lime   – moderate
    if (ratio < 0.75) return '#22c55e'; // green  – good
    return '#4ade80';                   // bright green – near peak
  }

  // ── Styles ─────────────────────────────────────────────────────────────────

  _styles() {
    return `
      :host { display: block; }

      .card {
        background: var(--ha-card-background, var(--card-background-color, #1c1c1e));
        border-radius: var(--ha-card-border-radius, 12px);
        box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0,0,0,.3));
        padding: 20px;
        overflow: hidden;
        box-sizing: border-box;
      }

      .card-title {
        font-size: 1rem;
        font-weight: 600;
        letter-spacing: .02em;
        margin-bottom: 16px;
        color: var(--primary-text-color, #e5e7eb);
      }

      /* Scrollable horizontal row */
      .panels-row {
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 6px;
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,.15) transparent;
      }
      .panels-row::-webkit-scrollbar { height: 4px; }
      .panels-row::-webkit-scrollbar-track { background: transparent; }
      .panels-row::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,.15);
        border-radius: 2px;
      }

      /* Individual panel tile */
      .panel-tile {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 9px;
        cursor: pointer;
        user-select: none;
        flex-shrink: 0;
        -webkit-tap-highlight-color: transparent;
        transition: transform .15s ease;
      }
      .panel-tile:active { transform: scale(.96); }

      .panel-name {
        font-size: .75rem;
        font-weight: 500;
        color: var(--secondary-text-color, #9ca3af);
        text-align: center;
        max-width: 72px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Solar panel shell */
      .solar-panel {
        width: 62px;
        height: 124px;
        display: flex;
        flex-direction: column;
        border-radius: 5px;
        overflow: hidden;
        border: 2px solid var(--pc, #555e6c);
        box-shadow:
          0 0 0 1px rgba(0,0,0,.5),
          0 0 10px -2px var(--pc, #555e6c);
        transition: border-color .4s ease, box-shadow .4s ease;
        background: #101827;
        position: relative;
      }

      /* Aluminium frame strips */
      .frame-top {
        flex-shrink: 0;
        height: 5px;
        background: linear-gradient(180deg, #6b7280 0%, #374151 100%);
        position: relative;
        z-index: 2;
      }
      .frame-bottom {
        flex-shrink: 0;
        height: 5px;
        background: linear-gradient(0deg, #6b7280 0%, #374151 100%);
        position: relative;
        z-index: 2;
      }

      .panel-body {
        flex: 1;
        position: relative;
        overflow: hidden;
      }

      /* 3 × 4 cell grid */
      .panel-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(4, 1fr);
        gap: 2px;
        padding: 3px;
        height: 100%;
        box-sizing: border-box;
      }

      .cell {
        background: #162032;
        border-radius: 2px;
        border: 1px solid #1e3a5f;
        transition: background .4s ease, border-color .4s ease;
      }

      .panel-tile.producing .cell {
        background: #1a3a5c;
        border-color: color-mix(in srgb, var(--pc, #22c55e) 40%, #1e3a5f);
      }

      .panel-tile.producing .solar-panel {
        box-shadow:
          0 0 0 1px rgba(0,0,0,.5),
          0 0 18px -2px var(--pc, #22c55e),
          inset 0 0 20px -8px color-mix(in srgb, var(--pc, #22c55e) 18%, transparent);
      }

      /* Shimmer animation */
      .shine {
        position: absolute;
        inset: 0;
        background: linear-gradient(
          135deg,
          transparent 25%,
          rgba(255,255,200,.07) 45%,
          rgba(255,255,200,.14) 50%,
          rgba(255,255,200,.07) 55%,
          transparent 75%
        );
        background-size: 200% 200%;
        opacity: 0;
        transition: opacity .4s;
        pointer-events: none;
      }

      .panel-tile.producing .shine {
        opacity: 1;
        animation: shimmer 4s ease-in-out infinite;
      }

      @keyframes shimmer {
        0%   { background-position: 200% 200%; }
        50%  { background-position:   0%   0%; }
        100% { background-position: 200% 200%; }
      }

      /* Stats */
      .panel-stats { text-align: center; line-height: 1.35; }

      .power {
        font-size: .95rem;
        font-weight: 700;
        color: var(--pc, var(--primary-text-color, #e5e7eb));
        transition: color .4s ease;
      }

      .energy {
        font-size: .78rem;
        color: var(--secondary-text-color, #9ca3af);
      }

      .unit { font-size: .7rem; font-weight: 400; opacity: .8; }

      .hidden { display: none; }

      .panel-tile.unavailable .solar-panel {
        opacity: .4;
        filter: grayscale(.8);
      }
      .panel-tile.unavailable .power {
        color: var(--secondary-text-color, #9ca3af);
      }
    `;
  }

  // ── HA card helpers ─────────────────────────────────────────────────────────

  getCardSize() {
    return 4;
  }

  static getStubConfig() {
    return {
      title: 'Solar Array',
      max_power: 300,
      panel_justify: 'left',
      inverters: [
        {
          power_entity: 'sensor.inverter_122345007737_watts',
          energy_entity: 'sensor.inverter_122345007737_today_s_energy_production',
          name: 'Panel 1',
        },
        {
          power_entity: 'sensor.inverter_122345007738_watts',
          energy_entity: 'sensor.inverter_122345007738_today_s_energy_production',
          name: 'Panel 2',
        },
        {
          power_entity: 'sensor.inverter_122345007739_watts',
          energy_entity: 'sensor.inverter_122345007739_today_s_energy_production',
          name: 'Panel 3',
        },
      ],
    };
  }
}

customElements.define('enphase-solar-panel-card', EnphaseSolarPanelCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'enphase-solar-panel-card',
  name: 'Enphase Solar Panel Card',
  description: 'Shows each Enphase microinverter as a portrait solar panel tile with power & daily energy',
  preview: false,
});

console.info(
  `%c ENPHASE-SOLAR-PANEL-CARD %c v${CARD_VERSION} `,
  'background:#f59e0b;color:#000;font-weight:bold;padding:2px 4px;border-radius:3px 0 0 3px',
  'background:#374151;color:#fff;padding:2px 4px;border-radius:0 3px 3px 0',
);
