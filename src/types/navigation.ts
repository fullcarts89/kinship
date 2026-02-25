/**
 * Navigation Types
 *
 * Route parameter types for Expo Router typed routes.
 * These augment the auto-generated types from Expo Router.
 */

/** Person detail screen params */
export interface PersonRouteParams {
  id: string;
}

/** Memory add screen params */
export interface MemoryAddRouteParams {
  /** Pre-selected person ID (optional, from person profile) */
  personId?: string;
}

/** Reach out screen params */
export interface ReachOutRouteParams {
  id: string;
}

/** Settings sub-screen params */
export interface SettingsRouteParams {
  section?: "account" | "notifications" | "privacy" | "about";
}
