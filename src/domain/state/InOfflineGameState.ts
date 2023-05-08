import { Logger } from "word-guessing-game-common";
import { State } from "./State";
import { IVirtualInput } from "./IVirtualInput";
import { GuessResult, WordGame } from "word-guessing-lib";
import { CTRL_C, ESC } from "../Keys";

export interface OfflineGameEvents {
  leaveGame(): void;
}

export class InOfflineGameState implements State {

  logger: Logger;
  input: IVirtualInput;

  wordGame: WordGame;

  offlineGameEvents: OfflineGameEvents;

  constructor(logger: Logger, input: IVirtualInput, wordGame: WordGame, offlineGameEvents: OfflineGameEvents) {
    this.logger = logger;
    this.input = input;
    this.wordGame = wordGame;
    this.offlineGameEvents = offlineGameEvents;

    this.bind();
  }

  handleData(char: string, virtualInput: IVirtualInput): void {
    switch (char) {
      case ESC:
      case CTRL_C:
        this.offlineGameEvents.leaveGame();
        break;
      case '\r': // Enter
        try {
          const result = this.wordGame.verifyGuess(this.input.value);

          this.logger.newLine();

          switch (result) {
            case GuessResult.SUCCESSFUL_GUESS:
              this.logger.writeLn('Success !')
              break;
            case GuessResult.WORD_DO_NOT_EXIST:
              this.logger.writeLn('This word do not exist in the database.');
              break;
            case GuessResult.WORD_DO_NOT_MATCH_SEQUENCE:
              this.logger.writeLn(`This word do not match the current sequence ('${this.wordGame.currentSequence}').`);
              break;
            default:
              this.logger.error('Internal error');
              console.error(`GuessResult '${result} is unknown`);
          }
          if (this.wordGame.remainingAttempts() === 0) {
            this.logger.writeLn('You have failed to find a word matching this sequence of letters.');
            this.logger.writeLn(`You could have tried : '${this.wordGame.getExampleForSequence()}'`);
            this.wordGame.reset();

            this.logger.prompt();
          } else {
            this.logger.prompt();
          }
        } catch (err) {
          console.error(err);
        } finally {
          this.input.value = "";
        }
        break;
    }
  }

  bind() {
    this.input.onNewCharacter = (e, v) => this.handleData(e, v);
  }

}