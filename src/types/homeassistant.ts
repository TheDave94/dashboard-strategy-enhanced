// ====================================================================
// HomeAssistant Interface
// ====================================================================
// Minimal typed representation of the `hass` object passed to strategies.
// Only includes properties actually used by the simon42 dashboard strategy.
// ====================================================================

import {
  HassEntities,
  HassEntity,
  HassConfig,
  HassServices,
  Connection,
  Auth,
  MessageBase,
  HassServiceTarget,
} from 'home-assistant-js-websocket';

import { EntityRegistryEntry, DeviceRegistryEntry, AreaRegistryEntry, FloorRegistryEntry } from './registries';

// -- Supporting Types -------------------------------------------------

export interface Themes {
  default_theme: string;
  default_dark_theme: string | null;
  themes: Record<string, Record<string, string>>;
  darkMode: boolean;
  theme: string;
}

export interface FrontendLocaleData {
  language: string;
  number_format: 'language' | 'system' | 'comma_decimal' | 'decimal_comma' | 'space_comma' | 'none';
  time_format: 'language' | 'system' | '12' | '24';
  date_format: 'language' | 'system' | 'DMY' | 'MDY' | 'YMD';
  first_weekday: 'language' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  time_zone: 'local' | 'server';
}

export interface ServiceCallRequest {
  domain: string;
  service: string;
  serviceData?: Record<string, any>;
  target?: HassServiceTarget;
}

export interface ServiceCallResponse {
  context: { id: string; parent_id?: string; user_id?: string | null };
  response?: any;
}

// -- Main Interface ---------------------------------------------------

export interface HomeAssistant {
  auth: Auth;
  connection: Connection;
  connected: boolean;

  // Registries — primary data source for the strategy
  states: HassEntities;
  entities: Record<string, EntityRegistryEntry>;
  devices: Record<string, DeviceRegistryEntry>;
  areas: Record<string, AreaRegistryEntry>;
  floors: Record<string, FloorRegistryEntry>;

  // Services & config
  services: HassServices;
  config: HassConfig;

  // UI / locale
  themes: Themes;
  language: string;
  locale: FrontendLocaleData;

  // Methods used by the strategy
  callService(
    domain: string,
    service: string,
    serviceData?: Record<string, any>,
    target?: HassServiceTarget,
    notifyOnError?: boolean,
    returnResponse?: boolean
  ): Promise<ServiceCallResponse>;

  callWS<T>(msg: MessageBase): Promise<T>;

  sendWS(msg: MessageBase): void;

  formatEntityState(stateObj: HassEntity, state?: string): string;

  formatEntityAttributeValue(stateObj: HassEntity, attribute: string, value?: any): string;

  formatEntityAttributeName(stateObj: HassEntity, attribute: string): string;
}

// Re-export commonly used websocket types for convenience
export type { HassEntities, HassEntity, HassConfig, HassServices, Connection, Auth, MessageBase, HassServiceTarget };
