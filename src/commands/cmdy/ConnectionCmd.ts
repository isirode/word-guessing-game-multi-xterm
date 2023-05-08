import { CmdResult, Awaitable } from "cmdy";
import { CmdDefinitionImpl } from "./CmdDefinitionImpl";
import { Connection } from "../../domain/models/Connection";
import { P2PRoom } from "../../domain/P2PRoom";
import { Logger } from "word-guessing-game-common";
import { RoomManager } from "../../domain/RoomManager";

export type Format = (value: string) => string;

export class ConnectionCmd extends CmdDefinitionImpl {

  logger: Logger;
  p2pRoom: P2PRoom;
  roomManager: RoomManager;
  // FIXME : change the formatting system
  // formatRoomName: Format;

  constructor(logger: Logger, p2pRoom: P2PRoom, roomManager: RoomManager/*, formatRoomName: Format*/) {
    super();

    this.logger = logger;
    this.p2pRoom = p2pRoom;
    this.roomManager = roomManager;
    /*this.formatRoomName = formatRoomName;*/

    this.name = "/connections";
    this.description = "List the connections";

    // FIXME : this this, fork or 
    this.exe = async (cmd) => await this.doExe(cmd);
  }

  async doExe(cmd: CmdResult): Promise<void> {
    console.log("connections");
    console.log(cmd.flags);
    console.log(cmd.valueFlags);
    
    this.p2pRoom?.connections.forEach((value: Connection, key: string) => {
      const user = this.p2pRoom.getUser(key);
      // this.logger.writeLn(`${this.formatRoomName(this.roomManager.currentRoom?.roomName)}:${key}:${user.name}`);
      this.logger.writeLn(`${key}:${user.name}`);
    });
  }

}