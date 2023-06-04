import { IRpcCallTarget } from "peerjs-rpc";
import { IPingService } from "./IPingService";
import prettyMilliseconds from 'pretty-ms';
import { ILogger, LoggerFactory } from "log4j2-typescript";

export class PingService implements IPingService {

  id: string;
  nextTarget: IRpcCallTarget = {};

  logger: ILogger = LoggerFactory.getLogger('com.isirode.word-guessing.ping.PingService');

  constructor(id: string) {
    this.id = id;
  }

  async echo(dateAsNumber: number): Promise<number> {
    // Info : using Date should be better than window.performance
    this.logger.debug(`echo ${dateAsNumber}`);
    
    // Info : uncomment if need to log the diff on the remote side
    // FIXME : make it an option ?
    // const date = new Date(dateAsNumber);
    const nowMS = Date.now();
    // const now = new Date(nowMS);
    // const diff = nowMS - date.getTime();
    // console.log(`reception time is : ${now}`);
    // console.log(`parameter time is : ${date}`);
    // console.log(`diff : ${prettyMilliseconds(diff)}`);
    return nowMS;
  }

}