import Dexie from "dexie";

interface ISavedSettings {
  id?: number;
  domain: string;
  name: string;
  settings: any;
}

export class SettingsDatabase extends Dexie {
  settings: Dexie.Table<ISavedSettings, number>;

  constructor() {
    super('SettingsDatabase');

    this.version(1).stores({
      settings: 'id++, domain, name'
    });

    this.settings = this.table('settings');
  }

  async save(domain: string, name: string, settingsObject: any) {
    const savedSettings: ISavedSettings = {
      domain,
      name,
      settings: settingsObject
    };
    return this.settings.add(savedSettings);
  }

  async find(domain: string, name: string,): Promise<any | undefined> {
    const result = await this.settings
      .where({domain: domain, name: name})
      .first();
    return result?.settings;
  }
}
