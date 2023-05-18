import { CmdResult, ValueFlag } from "cmdy";
import { CmdDefinitionImpl } from "./CmdDefinitionImpl";
import { Logger } from "word-guessing-game-common";
import { Events, GameCommand, WordGameMultiInitializer } from "../domain/GameCommand";
import Emittery from "emittery";

// FIXME : would want to have the command retrieve the data dynamically ?

const gameType: ValueFlag = {
  name: "game",
  description: "Precise the type of game to start",
  shorthand: "g",
  types: ["string"],
  required: false,
}

// FIXME : not common to every games
const lang: ValueFlag = {
  name: "lang",
  description: "Precise the language for the game",
  shorthand: "l",
  types: ["string"],
  required: false,
}

// TODO : split the parsing and the logic
export class StartGameCmd extends CmdDefinitionImpl {

  logger: Logger;

  gameCommand: GameCommand;

  get gameEvents(): Emittery<Events> {
    return this.gameCommand.events;
  }

  constructor(logger: Logger, wordGameMultiInitializer: WordGameMultiInitializer) {
    super();

    this.logger = logger;

    // FIXME : should it be passed as a parameter ?
    this.gameCommand = new GameCommand(logger, wordGameMultiInitializer);

    this.name = "/play";
    this.alias = [
      "/start"
    ];
    this.description = "Start a game";
    this.flags = [
      gameType, lang
    ];
    this.allowUnknownArgs = false;

    this.exe = async (cmd) => await this.doExe(cmd);
  }

  public async doExe(cmd: CmdResult): Promise<void> {
    console.log("start");
    console.log(cmd.flags);
    console.log(cmd.valueFlags);

    const game: string = cmd.valueFlags['game'];
    const lang: string = cmd.valueFlags['lang'];

    this.gameCommand.startGame(game, lang);
  }
}

// TODO : command go to launch the game
// And /start would not start, just init the players
