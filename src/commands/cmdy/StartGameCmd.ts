import { CmdResult, Awaitable, ValueFlag, CmdDefinition } from "cmdy";
import { CmdDefinitionImpl } from "./CmdDefinitionImpl";
import { WordGameMulti } from "../../domain/WordGameMulti";
import { Logger } from "word-guessing-game-common";

// FIXME : would want to have the command retrieve the data dynamically ?

const gameType: ValueFlag = {
  name: "game",
  description: "Precise the type of game to start",
  shorthand: "g",
  types: ["string"],
  required: false,
}

export interface StartGameEvents {
  onStartedGame(game: WordGameMulti): void;
}

export type WordGameMultiInitializer = () => WordGameMulti;

// TODO : split the parsing and the logic
export class StartGameCmd extends CmdDefinitionImpl {

  logger: Logger;
  wordGameMultiInitializer: WordGameMultiInitializer;
  startGameEvents: StartGameEvents;

  result: WordGameMulti;

  constructor(logger: Logger, startGameEvents: StartGameEvents, wordGameMultiInitializer: WordGameMultiInitializer) {
    super();

    this.logger = logger;
    this.wordGameMultiInitializer = wordGameMultiInitializer;
    this.startGameEvents = startGameEvents;

    this.name = "/play";
    this.alias = [
      "/start"
    ];
    this.description = "Start a game";
    this.flags = [
      gameType
    ];
    this.allowUnknownArgs = false;

    this.exe = async (cmd) => await this.doExe(cmd);
  }

  public async doExe(cmd: CmdResult): Promise<void> {
    console.log("start");
    console.log(cmd.flags);
    console.log(cmd.valueFlags);

    const game: string = cmd.valueFlags['game'];

    if (game === 'word' || game === 'word-guessr' || game === undefined) {
      console.log('yeah');

      this.result = this.wordGameMultiInitializer();

      // TODO : should be divided in two phases
      this.result.startGame();

      this.startGameEvents.onStartedGame(this.result);

    } else {
      // TODO : format as a warn
      this.logger.writeLn(`The game '${game}' is not recognized`);
    }
  }
}

// TODO : command go to launch the game
// And /start would not start, just init the players
