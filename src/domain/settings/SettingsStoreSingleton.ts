// FIXME : design
// I do not know if typescript support well a generic here
// In other languages, it would generate a class per generics

import { SettingsStore } from "./SettingsStore";

// But there is no typing at runtime in Typescript
export class SettingsStoreSingleton {
  private static settingsStore: SettingsStore;

  static instance(): SettingsStore {
    if (SettingsStoreSingleton.settingsStore === undefined) {
      SettingsStoreSingleton.settingsStore = new SettingsStore();
    }
    return SettingsStoreSingleton.settingsStore;
  }
}