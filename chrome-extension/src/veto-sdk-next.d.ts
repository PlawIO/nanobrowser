// Augments veto-sdk/browser with APIs shipping in SDK >=2.2.0.
// Remove this file once veto-sdk is upgraded past that version.

import type { Rule, OutputRule } from 'veto-sdk/browser';

declare module 'veto-sdk/browser' {
  interface Veto {
    addRules(rules: Rule[], outputRules?: OutputRule[]): void;
    removeRule(ruleId: string): void;
    getRules(): Rule[];
  }
}
