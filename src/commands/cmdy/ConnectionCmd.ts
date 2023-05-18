import { CmdResult } from "cmdy";
import { CmdDefinitionImpl } from "./CmdDefinitionImpl";
import { Connection, P2PRoom } from "peerjs-room";
import { Logger } from "word-guessing-game-common";
import { RoomService } from "peerjs-room";

export type Format = (value: string) => string;

export class ConnectionCmd extends CmdDefinitionImpl {

  logger: Logger;
  p2pRoom: P2PRoom;
  roomManager: RoomService;

  constructor(logger: Logger, p2pRoom: P2PRoom, roomManager: RoomService) {
    super();

    this.logger = logger;
    this.p2pRoom = p2pRoom;
    this.roomManager = roomManager;

    this.name = "/connections";
    this.description = "List the connections";

    // FIXME : fix this, fork for instance 
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