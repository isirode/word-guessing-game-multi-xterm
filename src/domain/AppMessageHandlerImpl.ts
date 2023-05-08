import { log } from "console";
import { Logger } from "word-guessing-game-common";
import { WordGameMessage, WordGameMessageType } from "./models/Message";
import { AnyMessage, AppMessageHandler, Message, User } from "./P2PRoom";
import { RoomManager } from "./RoomManager";
import { WordGameMulti } from "./WordGameMulti";

export type WordGameMultiInitializer = () => WordGameMulti;
// FIXME : there is another definition doing the same thing
// We should try to clean up this
export type OnStartedGame = (wordGameMulti: WordGameMulti) => void;

export class AppMessageHandlerImpl implements AppMessageHandler {

  logger: Logger;
  roomManager: RoomManager;
  wordGameMultiInitializer: WordGameMultiInitializer;
  onStartedGame: OnStartedGame;

  constructor(logger: Logger, roomManager: RoomManager, wordGameMultiInitializer: WordGameMultiInitializer, onStartedGame: OnStartedGame) {
    this.logger = logger;
    this.roomManager = roomManager;
    this.wordGameMultiInitializer = wordGameMultiInitializer;
    this.onStartedGame = onStartedGame;
  }

  onAppMessage(user: User, message: AnyMessage, root: Message): void {
    // this.logger.writeLn(`(${formatPeerName(user.name)}) : ${formatWarn("received an application level message but there is no handling for this")}`);

    // Info : we try to start the game if necessary
    // TODO : another phase / messaging stack for this
    // pick game or something
    if (user.peer.id === this.roomManager.currentRoom.roomOwner.id) {
      const wordGameMessage: WordGameMessage = message as WordGameMessage;
      if (wordGameMessage.wordGameMessageType === WordGameMessageType.StartingGame) {
        // if (wordGameMulti !== null) {
        //   console.warn("there is an error with the state of the application");
        // }

        let wordGameMulti = this.wordGameMultiInitializer();

        wordGameMulti.handleAppMessage(user, message, root);

        this.onStartedGame(wordGameMulti);

      } else {
        // logger.writeLn(`(${formatPeerName(user.name)}) : ${formatWarn("received an application level message but there is no handling for this")}`);
        console.warn("there is an error with the state of the application");
        console.warn(message);
      }
    }
  }
}