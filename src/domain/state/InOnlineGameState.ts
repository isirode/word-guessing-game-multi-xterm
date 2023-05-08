import { Logger } from "word-guessing-game-common";
import { ENTER } from "../Keys";
import { P2PRoom } from "../P2PRoom";
import { RoomManager } from "../RoomManager";
import { WordGameMulti } from "../WordGameMulti";
import { IVirtualInput } from "./IVirtualInput";
import { State } from "./State";
import { CmdDefinition, parseCmd } from "cmdy";
import { ModifySettingsCmd } from "../../commands/cmdy/WordGameSettingsCmd";
import { PlayerCmd } from "../../commands/cmdy/PlayerCmd";
import { ConnectionCmd } from "../../commands/cmdy/ConnectionCmd";
import { LeaveGameCmd, LeaveGameEvents } from "../../commands/cmdy/LeaveGameCmd";

export class InOnlineGameState implements State {

  logger: Logger;
  input: IVirtualInput;
  wordGameMulti: WordGameMulti;

  root: CmdDefinition;

  constructor(logger: Logger, input: IVirtualInput, roomManager: RoomManager, p2pRoom: P2PRoom, wordGameMulti: WordGameMulti, leaveGameEvents: LeaveGameEvents) {
    this.logger = logger;
    this.input = input;
    this.wordGameMulti = wordGameMulti;

    // TODO : leave game
    const players = new PlayerCmd(logger, wordGameMulti);
    const settings = new ModifySettingsCmd(logger, wordGameMulti);
    const connectionCmd = new ConnectionCmd(logger, p2pRoom, roomManager);
    const leaveGameCmd = new LeaveGameCmd(wordGameMulti, leaveGameEvents);

    this.root = {
      name: "",
      description: "",
      cmds: [
        players,
        settings,
        connectionCmd,
        leaveGameCmd,
      ],
      flags: [
          // version
      ],
      //exe: async () => console.log("")
    }

    this.bind();
  }

  async handleData(char: string, input: IVirtualInput): Promise<void> {
    if (char !== ENTER) {
      return;
    }
    try {
      const text = input.value;
      // FIXME : this is in common with InRoomState
      if (text.startsWith('/')) {
        console.log('starts with /, using cmdy');
        const argsForCmdy = [...text.trim().split(' ')]

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
        }
      } else {
        this.wordGameMulti.sendMessage(text);
      }
    } catch (err) { // FIXME : do not seem to be catching exceptions of promise of parseResult.exe
      console.log("an unexpected error occurred");
      console.error(err);
    } finally {
      this.logger.prompt();
  
      this.input.clear();
    }
  }

  bind() {
    this.input.onNewCharacter = (e, v) => this.handleData(e, v);
  }
}