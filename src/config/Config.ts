export interface IceServer {
  url: string;
  username?: string;
  credential?: string;
}

export interface RemoteDatabase {
  filename: string;
}

export interface Config {
  peerServerHostname: string;
  peerServerPort: number;
  secure: boolean;
  iceServers?: IceServer[];
  wordDatabaseRootUrl: string;
  frenchWordDatabase: RemoteDatabase;
  englishWordDatabase: RemoteDatabase;
}

export function buildConfig(): Config {
  const config: Config = JSON.parse(process.env.ENV_JSON);
  return config;
}
