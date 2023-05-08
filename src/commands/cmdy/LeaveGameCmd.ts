import { Awaitable, CmdDefinition, CmdResult } from "cmdy";
import { CmdDefinitionImpl } from "./CmdDefinitionImpl";
import { force } from "./Flags";
import { P2PRoom } from "../../domain/P2PRoom";
import { RoomManager } from "../../domain/RoomManager";
import { WordGameMulti } from "../../domain/WordGameMulti";

// export type LeaveGameHandler = () => void;

export interface LeaveGameEvents {
  onLeaveGame(): void;
}

export class LeaveGameCmd extends CmdDefinitionImpl {

  wordGameMulti: WordGameMulti;
  leaveGameEvents: LeaveGameEvents;

  constructor(wordGameMulti: WordGameMulti, leaveGameEvents: LeaveGameEvents) {
    super();

    this.wordGameMulti = wordGameMulti;
    this.leaveGameEvents = leaveGameEvents;

    this.name = "/leave";
    this.description = "Allow to leave the game";
    this.flags = [
      // force,
    ];
    
    this.exe = async (cmd) => await this.doExe(cmd)
  }

  public async doExe(cmd: CmdResult): Promise<void> {
    console.log("leave game");
    console.log(cmd.flags);
    console.log(cmd.valueFlags);

    await this.wordGameMulti.leave();

    // TODO : transfer ownership
    // TODO : acquire ownership command
    // wordGameMulti = undefined;

    this.leaveGameEvents.onLeaveGame();

    console.log("has left");
  }

}
