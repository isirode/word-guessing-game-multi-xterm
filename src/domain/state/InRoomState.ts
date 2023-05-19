import { Logger } from "word-guessing-game-common";
import { ConnectionCmd } from "../../commands/cmdy/ConnectionCmd";
import { LeaveRoomCmd } from "../../commands/cmdy/LeaveRoomCmd";
import { StartGameCmd } from "../../commands/cmdy/StartGameCmd";
import { P2PRoom, RoomService } from "peerjs-room";
import { State } from "./State";
import { CmdDefinition, parseCmd } from "cmdy";
import { IVirtualInput } from "./IVirtualInput";
import { ENTER, ESC } from "../Keys";
import { Events, RoomCommand } from "../../commands/domain/RoomCommand";
import Emittery from "emittery";
import { WordGameMultiInitializer, Events as GameEvents, GameCommand } from "../../commands/domain/GameCommand";
import { RoomAdminCmd } from "../../commands/cmdy/RoomAdminCmd";
import { WhisperCmd } from "../../commands/cmdy/WhisperCmd";

export class InRoomState implements State {
  
  logger: Logger;
  input: IVirtualInput;
  roomManager: RoomService;
  p2pRoom: P2PRoom;

  root: CmdDefinition;
  
  roomCommand: RoomCommand;
  gameCmd: StartGameCmd;

  get roomEvents(): Emittery<Events> {
    return this.roomCommand.events;
  }

  get gameEvents(): Emittery<GameEvents> {
    return this.gameCmd.gameEvents;
  }

  // FIXME : replace peerjs peer by ours
  constructor(logger: Logger, input: IVirtualInput, roomManager: RoomService, p2pRoom: P2PRoom, wordGameMultiInitializer: WordGameMultiInitializer) {
    // need to be able to
    // leave
    // start game
    // room actions

    this.logger = logger;
    this.input = input;
    this.roomManager = roomManager;
    this.p2pRoom = p2pRoom;

    // FIXME : should not be able to create room while in room right ?
    // Or maybe you should ?
    this.roomCommand = new RoomCommand(logger, roomManager, undefined);
    const leave = new LeaveRoomCmd(this.roomCommand, p2pRoom, roomManager);
    const admin = new RoomAdminCmd(p2pRoom);
    const whisper = new WhisperCmd(this.roomCommand, p2pRoom);

    this.gameCmd = new StartGameCmd(logger, wordGameMultiInitializer);

    const connectionCmd = new ConnectionCmd(logger, p2pRoom, roomManager);
    // FIXME : could be null
    // const settings = new ModifySettingsCmd(logger, wordGameMulti);

    // const game: CmdDefinition = {
    //   name: "/game",
    //   description: "Game commands",
    //   flags: [
    //   ],
    //   cmds: [
    //     remove,
    //     modifySettings
    //   ]
    // }

    this.root = {
      name: "",
      description: "",
      cmds: [
          this.gameCmd,
          leave,
          connectionCmd,
          admin,
          whisper
      ],
      flags: [
          // version
      ],
      //exe: async () => console.log("")
    }

    this.bind();
  }

  async handleData(char: string, input: IVirtualInput): Promise<void> {
    // TODO : checkout for '//' as a way to send a message
    if (char !== ENTER) {
      return;
    }
    const text = input.value;
    if (text.startsWith('/')) {
      console.log('starts with /, using cmdy');
      const argsForCmdy = [...text.trim().split(' ')]
      try {
        const parseResult = parseCmd({
          cmd: this.root,
          globalFlags: [
              
          ],
          args: argsForCmdy
        });
        
        if (parseResult.err) {
          console.warn(parseResult.err);
          // TODO : this is prompting, it would be nice to control when the prompt is made
          // It has become hard to know
          this.logger.error(parseResult.err.message);// Info : we assume it is a normal exception
        } else {
          if (parseResult.msg) {
            console.log("has msg");
            this.logger.writeLn(parseResult.msg);
          }
          console.log("running command");

          // FIXME : this is not working
          // We return before the command is actually executed
          // Which cause a UI bug when using /leave
          await parseResult.exe();

          console.log("command executed");

          this.logger.prompt();
        }
        
      } catch (err) {// FIXME : do not seem to be catching exceptions of promise of parseResult.exe
        console.log("an unexpected error occurred");
        console.error(err);

        this.logger.prompt();
      } finally {
        input.value = "";
      }
    } else {
      this.p2pRoom.broadcastTextMessage(text);

      // FIXME : find a way to ensure this is called correctly
      input.value = "";

      this.logger.prompt();
    }
  }

  bind() {
    this.input.onNewCharacter = (char: string, input: IVirtualInput) => this.handleData(char, input);
  }

}