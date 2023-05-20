import { Logger } from "word-guessing-game-common";
import { WordGameMulti } from "../../domain/WordGameMulti";
import Emittery from "emittery";

export interface WordGameMultiInitializer {
  instantiate(lang: string): WordGameMulti;
}

export interface Events {
  createdGame: WordGameMulti;
  leavedGame: undefined;
}

export class GameCommand {

  logger: Logger;

  wordGameMultiInitializer: WordGameMultiInitializer;

  events: Emittery<Events>;

  constructor(logger: Logger, wordGameMultiInitializer: WordGameMultiInitializer) {
    this.logger = logger;

    this.wordGameMultiInitializer = wordGameMultiInitializer;

    this.events = new Emittery();
  }

  startGame(game: string | undefined, lang: string | undefined) {

    if (game === 'word' || game === 'word-guessr' || game === undefined) {
      console.log('yeah');

      const game = this.wordGameMultiInitializer.instantiate(lang);

      this.events.emit('createdGame', game);

    } else {
      // TODO : format as a warn
      this.logger.writeLn(`The game '${game}' is not recognized`);
    }

  }

  async leaveGame(wordGameMulti: WordGameMulti) {
    await wordGameMulti.leave();

    // TODO : transfer ownership
    // TODO : acquire ownership command
    // wordGameMulti = undefined;
    
    this.events.emit('leavedGame');

    console.log("has left");
  }

  async joinGame(wordGameMulti: WordGameMulti) {
    wordGameMulti.join();

    // TODO : transfer ownership
    // TODO : acquire ownership command
    // wordGameMulti = undefined;
    
    // this.events.emit('leavedGame');

    console.log("has left");
  }

}