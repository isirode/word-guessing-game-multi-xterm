import { Awaitable, CmdDefinition, CmdResult } from "cmdy";
import { CmdDefinitionImpl } from "./CmdDefinitionImpl";
import { force } from "./Flags";
import { P2PRoom } from "../../domain/P2PRoom";
import { RoomManager } from "../../domain/RoomManager";

// export type LeaveGameHandler = () => void;

export interface LeaveRoomEvents {
  onLeaveRoom(): void;
}

export class LeaveRoomCmd extends CmdDefinitionImpl {

  p2pRoom: P2PRoom;
  roomManager: RoomManager;
  peerId: string;// FIXME : it is probably bad design to have this
  leaveRoomEvents: LeaveRoomEvents;

  constructor(p2pRoom: P2PRoom, roomManager: RoomManager, peerId: string, leaveRoomEvents: LeaveRoomEvents) {
    super();

    this.p2pRoom = p2pRoom;
    this.roomManager = roomManager;
    this.peerId = peerId;
    this.leaveRoomEvents = leaveRoomEvents;

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
    
    // TODO : check if is game I suppose

    // TODO : clear room connection

    // TODO : send a message also ?

    await this.roomManager.leaveCurrentRoom(this.peerId);

    this.p2pRoom.disconnect();

    // TODO : transfer ownership
    // TODO : acquire ownership command
    // wordGameMulti = undefined;

    // Info : leaving the room will make the peer unfoundable on the server
    // So we need to either handle this
    // Or create another peer

    this.leaveRoomEvents.onLeaveRoom();

    console.log("has left");
  }

}
