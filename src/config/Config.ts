
export interface Config {
  peerServerHostname: string;
  peerServerPort: number;
}

export function buildConfig() {
  const config: Config = {
    peerServerHostname: process.env.PEER_SERVER_HOSTNAME,
    peerServerPort: Number.parseInt(process.env.PEER_SERVER_PORT)
  }
  return config;
}
