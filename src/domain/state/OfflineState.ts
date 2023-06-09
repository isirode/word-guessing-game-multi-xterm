import { Command, OutputConfiguration } from "commander";
import { State } from "./State";
import { IVirtualInput, NewCharacterEventData } from "./IVirtualInput";
import { DatabaseCommander, Logger, WordGameCommander } from "word-guessing-game-common";
import { RoomCommander } from "../../commands/commander/RoomCommander";
import { IWordDatabase, WordGame } from "word-guessing-lib";
import { RoomService } from "peerjs-room";
import { Events, PeerProvider } from "../../commands/domain/RoomCommand";
import Emittery, { UnsubscribeFunction } from 'emittery';

// TODO : arrow navigation in the commands

// TODO : add a help command
// TODO : use a context system : if press wg, stay in the wg command

export class OfflineState implements State {

  input: IVirtualInput;
  program: Command;
  logger: Logger;

  roomCommander: RoomCommander;

  unsubscribeInputNewCharEvent: UnsubscribeFunction;

  get roomEvents(): Emittery<Events> {
    return this.roomCommander.events;
  }

  constructor(input: IVirtualInput, logger: Logger, frenchDatabase: IWordDatabase, englishDatabase: IWordDatabase, wordGame: WordGame, roomService: RoomService, peerProvider: PeerProvider, configuration: OutputConfiguration) {
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

    const wordGameCommand = new WordGameCommander(wordGame, configureCommand, logger, frenchDatabase, englishDatabase);
    wordGameCommand.setup();
    configureCommand(wordGameCommand);
    this.program.addCommand(wordGameCommand);

    const databaseCommand = new DatabaseCommander(frenchDatabase, englishDatabase, configureCommand, logger);
    databaseCommand.setup();
    configureCommand(databaseCommand);
    this.program.addCommand(databaseCommand);

    this.roomCommander = new RoomCommander(roomService, peerProvider, configureCommand, logger);
    this.roomCommander.setup();
    configureCommand(this.roomCommander);
    this.program.addCommand(this.roomCommander);

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

  handleData({char, virtualInput}: NewCharacterEventData): void {
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
    this.unsubscribeInputNewCharEvent = this.input.events.on('onNewCharacter', this.handleData.bind(this));
  }

  onExit() {
    this.unsubscribeInputNewCharEvent();
  }

}