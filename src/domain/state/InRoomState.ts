import { Logger } from "word-guessing-game-common";
import { ConnectionCmd } from "../../commands/cmdy/ConnectionCmd";
import { LeaveRoomCmd, LeaveRoomEvents } from "../../commands/cmdy/LeaveRoomCmd";
import { StartGameCmd, StartGameEvents, WordGameMultiInitializer } from "../../commands/cmdy/StartGameCmd";
import { P2PRoom } from "../P2PRoom";
import { RoomManager } from "../RoomManager";
import { State } from "./State";
import Peer = require("peerjs");
import { CmdDefinition, parseCmd } from "cmdy";
import { IVirtualInput } from "./IVirtualInput";
import { ENTER, ESC } from "../Keys";

export class InRoomState implements State {
  
  logger: Logger;
  input: IVirtualInput;
  roomManager: RoomManager;
  p2pRoom: P2PRoom;
  root: CmdDefinition;

  // FIXME : replace peerjs peer by ours
  constructor(logger: Logger, input: IVirtualInput, roomManager: RoomManager, p2pRoom: P2PRoom, peer: Peer, startGameEvents: StartGameEvents, wordGameMultiInitializer: WordGameMultiInitializer, leaveRoomEvents: LeaveRoomEvents) {
    // need to be able to
    // leave
    // start game
    // room actions

    this.logger = logger;
    this.input = input;
    this.roomManager = roomManager;
    this.p2pRoom = p2pRoom;

    if (startGameEvents === null || startGameEvents === undefined) {
      console.warn("startGameEvents is null or undefined");
    }

    const start = new StartGameCmd(logger, startGameEvents, wordGameMultiInitializer);
    const leave = new LeaveRoomCmd(p2pRoom, roomManager, peer.id, leaveRoomEvents);
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
          start,
          leave,
          connectionCmd,
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
      this.p2pRoom.sendMessage(text);

      // FIXME : find a way to ensure this is called correctly
      input.value = "";

      this.logger.prompt();
    }
  }
  
  handleText(e: string): void {

  }

  bind() {
    this.input.onNewCharacter = (char: string, input: IVirtualInput) => this.handleData(char, input);
  }

}