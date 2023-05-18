import { CmdResult } from "cmdy";
import { CmdDefinitionImpl } from "./CmdDefinitionImpl";
import { P2PRoom, RoomService } from "peerjs-room";
import { RoomCommand } from "../domain/RoomCommand";

export class LeaveRoomCmd extends CmdDefinitionImpl {

  roomCommand: RoomCommand;
  p2pRoom: P2PRoom;
  roomManager: RoomService;

  constructor(roomCommand: RoomCommand, p2pRoom: P2PRoom, roomManager: RoomService) {
    super();

    this.roomCommand = roomCommand;
    this.p2pRoom = p2pRoom;
    this.roomManager = roomManager;

    this.name = "/leave";
    this.description = "Allow to leave the room";
    this.flags = [
      // force,
    ];
    
    this.exe = async (cmd) => await this.doExe(cmd)
  }

  public async doExe(cmd: CmdResult): Promise<void> {
    console.log("leave");
    console.log(cmd.flags);
    console.log(cmd.valueFlags);

    this.roomCommand.leaveRoom(this.p2pRoom);
  }

}
