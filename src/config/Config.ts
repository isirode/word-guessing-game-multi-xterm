
export interface Config {
  peerServerHostname: string;
  peerServerPort: number;
  secure: boolean;
}

export function buildConfig() {
  const config: Config = {
    peerServerHostname: process.env.PEER_SERVER_HOSTNAME,
    peerServerPort: Number.parseInt(process.env.PEER_SERVER_PORT),
    secure: JSON.parse(process.env.PEER_SERVER_SECURE),
  }
  return config;
}
