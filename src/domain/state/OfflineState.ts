import { Command, OutputConfiguration } from "commander";
import { State } from "./State";
import { IVirtualInput } from "./IVirtualInput";
import { DatabaseCommand, FrenchWordDatabase, Logger, WordGameCommand } from "word-guessing-game-common";
import { CreatedRoomCallback, JoinedRoomCallback, PeerProvider, RoomCommand } from "../../commands/RoomCommand";
import { WordGame } from "word-guessing-lib";
import { RoomManager } from "../RoomManager";
import Peer = require("peerjs");

// TODO : arrow navigation in the commands

// TODO : add a help command
// TODO : use a context system : if press wg, stay in the wg command

export class OfflineState implements State {

  // need start game offline
  // join room
  // create room
  // help

  input: IVirtualInput;
  program: Command;
  logger: Logger;

  constructor(input: IVirtualInput, logger: Logger, frenchWordDatabase: FrenchWordDatabase, wordGame: WordGame, roomManager: RoomManager, peerProvider: PeerProvider, joinedRoomCallback: JoinedRoomCallback, createdRoomCallback: CreatedRoomCallback, configuration: OutputConfiguration) {
    this.input = input;
    this.logger = logger;

    this.program = new Command();

    this.program
      // Info : if you set it, you will need to pass it as a parameter
      // If you do not set it, it will appear in the help command anyway
      // There is something weird actually
      // FIXME : 'run etc' is also working
      .name('/run')
      .description('CLI to execute commands')
      .version('0.0.1');

    const wordGameCommand = new WordGameCommand(wordGame, configureCommand, logger);
    wordGameCommand.setup();
    configureCommand(wordGameCommand);
    this.program.addCommand(wordGameCommand);

    const databaseCommand = new DatabaseCommand(frenchWordDatabase, configureCommand, logger);
    databaseCommand.setup();
    configureCommand(databaseCommand);
    this.program.addCommand(databaseCommand);

    const roomCommand = new RoomCommand(roomManager, peerProvider, configureCommand, logger, joinedRoomCallback, createdRoomCallback);
    roomCommand.setup();
    configureCommand(roomCommand);
    this.program.addCommand(roomCommand);

    configureCommand(this.program);


    function configureCommand(command: Command) {
      // command.showHelpAfterError();
      command.configureOutput(configuration);
      command.exitOverride(/*(err) => {
        console.log("attempting to exit");
      }*/);
    }

    this.bind();
  }

  onNewCharacter(char: string, virtualInput: IVirtualInput): void {
    switch (char) {
      case '\r': // Enter
        console.log(this);
        console.log(this.input);
        if (this.input.value.trim().length > 0) {
          // promptTerm.write(command);
          try {
            this.runCommand();
          }
          catch (error) {
            console.log(error);
          } finally {
            console.log('finally');
            //promptTerm.write(command);

            // FIXME : put this back
            // promptTerm.scrollToBottom();// use this for the normal flow

            this.input.value = '';
          }
        } else {
          this.logger.prompt();
        }
        break;
    }
  }

  async runCommand() {
    console.log("runCommand");

    const text = this.input.value;

    // process (node), script (script.js), args
    // require to pass the name of the command if the name is passed to the program
    // program.name('name-of-the-app')
    const args = ['nothing', /*'nothing',*/ ...text.trim().split(' ')]

    try {
      await this.program.parseAsync(args);
    } catch (err) {
      console.log("an error occured:");
      console.warn(err);
    }
  }

  public bind() {
    // WARN : have to do it this way, otherwise 'this' will be the VirtualInput 
    // FIXME : find a better way
    this.input.onNewCharacter = (char, virtualInput) => this.onNewCharacter(char, virtualInput);
  }

}