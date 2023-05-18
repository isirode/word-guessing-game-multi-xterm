import { SettingsDatabase } from "./SettingsDatabase"

// TODO : pass the database as a parameter, use an interface
// FIXME : design
// should it be typed ?
// I do not know if Dexie support well multiple instance of the same database
// TODO : system so that the setting returned is unique accross the project
// with an option ensureUnique / useCache
// and a cache
export class SettingsStore {
  
  settingsDatabase: SettingsDatabase;

  constructor() {
    this.settingsDatabase = new SettingsDatabase();
  }

  watch<T extends object>(domain: string, name: string, settings: T): T {
    const self = this;
    type keys = keyof T;
    const proxy = new Proxy(settings, {
      set(obj: T, prop: keys, value) {
        console.log("settings through proxy");
        console.log(prop);
        console.log(value);
        obj[prop] = value;
        self.save(domain, name, obj);
        return true;
      }
    } as ProxyHandler<T>);
    return proxy;
  }

  // TODO : add a boolean to watch or not ?
  async find<T>(domain: string, name: string): Promise<T | undefined> {
    const settings = await this.settingsDatabase.find(domain, name);
    if (settings === undefined) {
      return undefined;
    }
    const proxy = this.watch(domain, name, settings);
    return proxy;
  }

  save<T>(domain: string, name: string, settingsObject: T) {
    this.settingsDatabase.save(domain, name, settingsObject);
  }

}
