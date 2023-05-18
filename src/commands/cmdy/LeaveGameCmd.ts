import { CmdResult } from "cmdy";
import { CmdDefinitionImpl } from "./CmdDefinitionImpl";
import { WordGameMulti } from "../../domain/WordGameMulti";
import { Logger } from "word-guessing-game-common";
import { Events, GameCommand } from "../domain/GameCommand";
import Emittery from "emittery";

export class LeaveGameCmd extends CmdDefinitionImpl {

  wordGameMulti: WordGameMulti;
  
  gameCommand: GameCommand;

  get gameEvents(): Emittery<Events> {
    return this .gameCommand.events;
  }

  constructor(logger: Logger, wordGameMulti: WordGameMulti) {
    super();

    this.wordGameMulti = wordGameMulti;
    
    this.gameCommand = new GameCommand(logger, undefined);

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

    await this.gameCommand.leaveGame(this.wordGameMulti);
  }

}
