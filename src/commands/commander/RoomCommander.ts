import { XtermCommand, Logger, ConfigureCommand } from 'word-guessing-game-common';
import { RoomService } from 'peerjs-room';
import { Events, PeerProvider, RoomCommand } from '../domain/RoomCommand';
import Emittery from "emittery";

// TODO : replace the writeLn by a writeLnError or equivalent
export class RoomCommander extends XtermCommand {

  roomCommand: RoomCommand;
  // FIXME : replace by an interface
  roomManager: RoomService;
  // peerProvider: PeerProvider;
  configureCommand: ConfigureCommand;

  // joinedRoomCallback: JoinedRoomCallback;
  // createdRoomCallback: CreatedRoomCallback;

  get events(): Emittery<Events> {
    return this.roomCommand.events;
  }

  constructor(roomService: RoomService, peerProvider: PeerProvider,  configureCommand: ConfigureCommand, logger: Logger/*, joinRoomCallback: JoinedRoomCallback, createdRoomCallback: CreatedRoomCallback*/) {
    super(logger);

    this.roomCommand = new RoomCommand(logger, roomService, peerProvider);
    this.roomManager = roomService;
    // this.peerProvider = peerProvider;
    this.configureCommand = configureCommand;

    // this.joinedRoomCallback = joinRoomCallback;
    // this.createdRoomCallback = createdRoomCallback;
  }

  public setup(): void {
    this.name('room');
    this.alias('rm');

    const listCommand = this.command('list');
    this.configureCommand(listCommand);
    listCommand
      // .alias('wasm')
      .alias('ls')
      .description('List the rooms of the server')
      .action(async () => {
        await this.roomCommand.listRooms();
      });

    const statusCommand = this.command('status');
    this.configureCommand(statusCommand);
    statusCommand
      // .alias('status')
      .description('Indicate the status of server')
      .action(() => {
        // TODO : this should be computed
        // TODO : check multiple status (WASM etc)
        // if (this.frenchWordDatabase.wasInit === true) {
        //   this.logger.info('The database was initialized');
        // } else {
        //   this.logger.info('The database was not initialized');
        // }
      });

    const joinCommand = this.command('join');
    this.configureCommand(joinCommand);
    joinCommand
      // .alias('status')
      .description('Join a room')
      .argument('<room>', 'the room to join')
      .option('-p, --password [password]', 'the password of the room')
      .action(async (roomId: string, password: string) => {
        await this.roomCommand.joinServerRoom(roomId, password);
      });

    const createCommand = this.command('create');
    this.configureCommand(createCommand);
    createCommand
      // .alias('status')
      .description('Create a room')
      .argument('<room-name>', 'the name of the room')
      .option('-p, --password [password]', 'the password of the room')
      .action(async (roomName: string, password?: string) => {
        await this.roomCommand.createServerRoom(roomName, password);
      });

    // TODO : init (using a factory)
  }

}
