import { log } from "console";
import { Logger } from "word-guessing-game-common";
import { StartingGameMessage, WordGameMessage, WordGameMessageType } from "./models/Message";
import { AnyMessage, Message, User, RoomService } from "peerjs-room";
import { WordGameMulti } from "./WordGameMulti";
import { WordGameMultiInitializer } from "../commands/domain/GameCommand";

// FIXME : there is another definition doing the same thing
// We should try to clean up this
export type OnStartedGame = (wordGameMulti: WordGameMulti) => void;

export class AppMessageHandlerImpl {

  logger: Logger;
  roomManager: RoomService;
  wordGameMultiInitializer: WordGameMultiInitializer;
  onStartedGame: OnStartedGame;

  constructor(logger: Logger, roomManager: RoomService, wordGameMultiInitializer: WordGameMultiInitializer, onStartedGame: OnStartedGame) {
    this.logger = logger;
    this.roomManager = roomManager;
    this.wordGameMultiInitializer = wordGameMultiInitializer;
    this.onStartedGame = onStartedGame;
  }

  onAppMessage(user: User, appMessage: AnyMessage, root: Message): void {
    // this.logger.writeLn(`(${formatPeerName(user.name)}) : ${formatWarn("received an application level message but there is no handling for this")}`);

    // Info : we try to start the game if necessary
    // TODO : another phase / messaging stack for this
    // pick game or something
    if (user.peer.id === this.roomManager.currentRoom.roomOwner.id) {
      const wordGameMessage: WordGameMessage = appMessage as WordGameMessage;
      if (wordGameMessage.wordGameMessageType === WordGameMessageType.StartingGame) {
        // if (wordGameMulti !== null) {
        //   console.warn("there is an error with the state of the application");
        // }
        const startingGameMessage = wordGameMessage.payload as StartingGameMessage;

        let wordGameMulti = this.wordGameMultiInitializer(startingGameMessage.lang);

        wordGameMulti.handleAppMessage(user, appMessage, root);

        this.onStartedGame(wordGameMulti);

      } else {
        // logger.writeLn(`(${formatPeerName(user.name)}) : ${formatWarn("received an application level message but there is no handling for this")}`);
        console.warn("there is an error with the state of the application");
        console.warn(appMessage);
      }
    }
  }
}