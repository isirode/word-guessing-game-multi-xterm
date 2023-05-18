import { CmdResult } from "cmdy";
import { CmdDefinitionImpl } from "./CmdDefinitionImpl";
import { P2PRoom, RoomService } from "peerjs-room";
import { RoomCommand } from "../domain/RoomCommand";
import { ILogger, LoggerFactory } from "log4j2-typescript";

// FIXME : could do more
// I am not sure how to handle it, since it is not on action, but just a request of log
export class RoomAdminCmd extends CmdDefinitionImpl {

  logger: ILogger = LoggerFactory.getLogger('term.RoomAdminCmd');
  p2pRoom: P2PRoom;

  constructor(p2pRoom: P2PRoom) {
    super();

    this.p2pRoom = p2pRoom;

    this.name = "/admin";
    this.description = "Log the admin of the room";
    this.flags = [
      // force,
    ];
    
    this.exe = async (cmd) => await this.doExe(cmd)
  }

  public async doExe(cmd: CmdResult): Promise<void> {
    console.log("leave");
    console.log(cmd.flags);
    console.log(cmd.valueFlags);

    const admin = this.p2pRoom.admin;
    if (admin !== undefined) {
      this.logger.info(`The admin of the room is ${admin.name}:${admin.peer.id}`);
    } else {
      this.logger.warn(`The admin of the room is unknown.`);
    }
  }

}
