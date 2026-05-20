"use strict";(self.webpackChunksimon42_dashboard_strategy=self.webpackChunksimon42_dashboard_strategy||[]).push([[612],{612(t,e,s){s.r(e);var i=s(684);class o extends i.WF{setConfig(t){if(!t?.sticky_entity||"string"!=typeof t.sticky_entity)throw new Error("simon42-sticky-lock-feature: `sticky_entity` is required");this._config=t}static getStubConfig(){return{type:"custom:simon42-sticky-lock-feature",sticky_entity:""}}shouldUpdate(t){if(t.has("_config")||t.has("context"))return!0;const e=t.get("hass");return!e||!this._config||e.states[this._config.sticky_entity]!==this.hass?.states[this._config.sticky_entity]}get _locked(){if(!this._config||!this.hass)return!1;const t=this.hass.states[this._config.sticky_entity];return"on"===t?.state}_onClick(t){t.stopPropagation(),t.preventDefault(),this._config&&this.hass&&this.hass.callService("input_boolean","toggle",{entity_id:this._config.sticky_entity})}render(){if(!this._config||!this.hass)return i.s6;if(!this.hass.states[this._config.sticky_entity])return i.s6;const t=this._locked;return i.qy`
      <button
        class=${t?"btn locked":"btn"}
        role="switch"
        aria-checked=${t?"true":"false"}
        aria-label=${t?"Unlock mode":"Lock mode"}
        title=${t?"Sticky lock on":"Sticky lock off"}
        @click=${this._onClick}
      >
        <ha-icon icon=${t?"mdi:lock":"mdi:lock-open-variant"}></ha-icon>
      </button>
    `}}o.properties={hass:{attribute:!1},context:{attribute:!1},_config:{state:!0}},o.styles=i.AH`
    :host {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      height: var(--feature-height, 36px);
    }
    .btn {
      all: unset;
      cursor: pointer;
      box-sizing: border-box;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--secondary-text-color);
      transition: background-color 120ms ease, color 200ms ease;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:hover {
      background: var(--secondary-background-color);
    }
    .btn:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
    .btn.locked {
      color: var(--state-active-color, var(--primary-color));
      background: color-mix(in srgb, var(--state-active-color, var(--primary-color)) 18%, transparent);
    }
    .btn ha-icon {
      --mdc-icon-size: 20px;
    }
  `,customElements.define("simon42-sticky-lock-feature",o),window.customCardFeatures=window.customCardFeatures||[],window.customCardFeatures.some(t=>"simon42-sticky-lock-feature"===t.type)||window.customCardFeatures.push({type:"simon42-sticky-lock-feature",name:"Sticky Lock (Simon42)",supported:(t,e)=>{const s=e?.entity_id;return!!s&&(!!t.states[s]&&s.startsWith("input_select."))},configurable:!0})}}]);