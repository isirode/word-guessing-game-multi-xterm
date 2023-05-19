import { CmdResult, ValueFlag } from "cmdy";
import { CmdDefinitionImpl } from "./CmdDefinitionImpl";
import { P2PRoom, RoomService } from "peerjs-room";
import { RoomCommand } from "../domain/RoomCommand";

// TODO : mutualize this
const id: ValueFlag = {
  name: "id",
  description: "Id of the player",
  shorthand: "i",
  types: ["string"],
  required: false,
}

const name: ValueFlag = {
  name: "name",
  description: "Name of the player",
  shorthand: "n",
  types: ["string"],
  required: false,
}

const message: ValueFlag = {
  name: "message",
  description: "Message to be send",
  shorthand: "m",
  types: ["string"],
  required: true,
}

// FIXME : cmdy does not support between quotes arguments very well, nor positional arguments
// So it does not work very well
export class WhisperCmd extends CmdDefinitionImpl {

  roomCommand: RoomCommand;
  p2pRoom: P2PRoom;

  constructor(roomCommand: RoomCommand, p2pRoom: P2PRoom) {
    super();

    this.roomCommand = roomCommand;
    this.p2pRoom = p2pRoom;

    this.name = "/whisper";
    this.description = "Whisper to an user of the room";
    this.flags = [
      id, name, message
    ];
    
    this.exe = async (cmd) => await this.doExe(cmd)
  }

  public async doExe(cmd: CmdResult): Promise<void> {
    console.log("leave");
    console.log(cmd.flags);
    console.log(cmd.valueFlags);

    const id: string = cmd.valueFlags['id'];
    const name: string = cmd.valueFlags['name'];
    const message: string = cmd.valueFlags['message']

    this.roomCommand.whisper(id, name, message, this.p2pRoom);
  }

}
