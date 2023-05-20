import { CmdResult } from "cmdy";
import { CmdDefinitionImpl } from "./CmdDefinitionImpl";
import { Logger } from "word-guessing-game-common";
import { GameCommand } from "../domain/GameCommand";
import { WordGameMulti } from "../../domain/WordGameMulti";

// TODO : split the parsing and the logic
export class JoinGameCmd extends CmdDefinitionImpl {

  logger: Logger;
  wordGameMulti: WordGameMulti;

  gameCommand: GameCommand;

  constructor(logger: Logger, wordGameMulti: WordGameMulti) {
    super();

    this.logger = logger;
    this.wordGameMulti = wordGameMulti;

    // FIXME : should it be passed as a parameter ?
    this.gameCommand = new GameCommand(logger, undefined);

    this.name = "/join";
    this.alias = [
      "/join"
    ];
    this.description = "Join the game";
    this.flags = [
      
    ];
    this.allowUnknownArgs = false;

    this.exe = async (cmd) => await this.doExe(cmd);
  }

  public async doExe(cmd: CmdResult): Promise<void> {
    console.log("start");
    console.log(cmd.flags);
    console.log(cmd.valueFlags);

    this.gameCommand.joinGame(this.wordGameMulti);
  }
}

// TODO : command go to launch the game
// And /start would not start, just init the players
