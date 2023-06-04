import { IRpcObject } from "peerjs-rpc";

export interface IPingService extends IRpcObject {
  echo(date: number): Promise<number>;
}
