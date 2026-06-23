/**
 * Minimal ambient declarations for the Foundry VTT runtime globals used by
 * this system. This is intentionally loose — for full IntelliSense, install
 * the community package `@league-of-foundry-developers/foundry-vtt-types`
 * and remove this file.
 */

declare const foundry: any;
declare const CONFIG: any;
declare const Hooks: any;
declare const game: any;
declare const ui: any;
declare const canvas: any;
declare const Roll: any;
declare const ChatMessage: any;
declare const Handlebars: any;

interface Window {
  foundry: any;
}
