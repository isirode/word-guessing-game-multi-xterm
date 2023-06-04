import { CmdResult } from "cmdy";
import { CmdDefinitionImpl } from "./CmdDefinitionImpl";
import { RoomCommand } from "../domain/RoomCommand";
import { IPingService } from "../../domain/ping/IPingService";

export class PingCmd extends CmdDefinitionImpl {

  roomCommand: RoomCommand;
  echoService: IPingService;

  constructor(roomCommand: RoomCommand, echoService: IPingService) {
    super();

    this.roomCommand = roomCommand;
    this.echoService = echoService;

    this.name = "/ping";
    this.description = "Send a ping request";
    this.flags = [
    ];
    
    this.exe = async (cmd) => await this.doExe(cmd)
  }

  public async doExe(cmd: CmdResult): Promise<void> {
    console.log("leave");
    console.log(cmd.flags);
    console.log(cmd.valueFlags);

    this.roomCommand.ping(this.echoService);
  }

}
