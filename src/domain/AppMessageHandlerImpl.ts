import { log } from "console";
import { Logger } from "word-guessing-game-common";
import { StartingGameMessage, WordGameMessage, WordGameMessageType } from "./models/Message";
import { AnyMessage, Message, User, RoomService } from "peerjs-room";
import { WordGameMulti } from "./WordGameMulti";
import { WordGameMultiInitializer } from "../commands/domain/GameCommand";
import Emittery from "emittery";

// FIXME : there is another definition doing the same thing
// We should try to clean up this
export type OnStartedGame = (wordGameMulti: WordGameMulti) => void;
export interface Events {
  onInitializedGame: {wordGameMulti: WordGameMulti};
}

export class AppMessageHandlerImpl {

  logger: Logger;
  roomManager: RoomService;
  wordGameMultiInitializer: WordGameMultiInitializer;

  events: Emittery<Events> = new Emittery();

  constructor(logger: Logger, roomManager: RoomService, wordGameMultiInitializer: WordGameMultiInitializer) {
    this.logger = logger;
    this.roomManager = roomManager;
    this.wordGameMultiInitializer = wordGameMultiInitializer;
  }

  async onAppMessage(user: User, appMessage: AnyMessage, root: Message): Promise<void> {
    console.log('onAppMessage', user, appMessage, root);
    // this.logger.writeLn(`(${formatPeerName(user.name)}) : ${formatWarn("received an application level message but there is no handling for this")}`);

    // TODO : another phase / messaging stack for this
    const wordGameMessage: WordGameMessage = WordGameMulti.getWordGameMessage(appMessage);

    // Info : we try to start the game if necessary
    if (wordGameMessage.wordGameMessageType === WordGameMessageType.InitGame) {
      
      const startingGameMessage = wordGameMessage.payload as StartingGameMessage;

      let wordGameMulti = this.wordGameMultiInitializer.instantiate(startingGameMessage.lang);

      await this.events.emit('onInitializedGame', {wordGameMulti});

      console.log('onInitializedGame emitted');

      wordGameMulti.handleAppMessage(user, appMessage, root);

    } else {
      // logger.writeLn(`(${formatPeerName(user.name)}) : ${formatWarn("received an application level message but there is no handling for this")}`);
      console.warn("there is an error with the state of the application");
      console.warn(appMessage, wordGameMessage);
    }
  }
}