import { XtermCommand, Logger, ConfigureCommand } from 'word-guessing-game-common';
import { PeerJSServerClient } from '../domain/adapters/secondary/api/PeerJSServerClient';
import Peer from 'peerjs';
import { IClient, IRoom } from '../domain/models/Room';
import { RoomManager } from '../domain/RoomManager';

// TODO : move it elswhere ?
function formatRoomForCmdLine(room: IRoom) {
  // TODO : should log something else than an ugly id for the roomOwner
  return `id: ${room.roomId}, name: ${room.roomName}, owner: ${room.roomOwner?.id}, players: ${room.clients?.size}`;
}

export type JoinRoomCallback = (room: IRoom) => void;

// TODO : replace the writeLn by a writeLnError or equivalent
export class RoomCommand extends XtermCommand {

  // FIXME : replace by an interface
  roomManager: RoomManager;
  peer: Peer;
  configureCommand: ConfigureCommand;

  joinRoomCallback: JoinRoomCallback;

  constructor(roomManager: RoomManager, peer: Peer,  configureCommand: ConfigureCommand, logger: Logger, joinRoomCallback: JoinRoomCallback) {
    super(logger);

    this.roomManager = roomManager;
    this.peer = peer;
    this.configureCommand = configureCommand;

    this.joinRoomCallback = joinRoomCallback;
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
        const rooms = await this.roomManager.getRooms();
        this.logger.newLine();
        rooms.forEach((room, key) => {
          this.logger.writeLn(formatRoomForCmdLine(room));
        });
        this.logger.prompt();
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
        console.log('room: ' + roomId + ', password: ' + password)
        this.logger.newLine();
        try {
          const room = await this.roomManager.joinRoom(roomId, this.peer.id);
          if (!room) {
            console.log('did not join room');
            this.logger.writeLn('We were not able to join the room');
            return
          }
          this.logger.writeLn('Room joined');
          // this.logger.writeLn('Fetching the room.');

          const self = this;
          // TODO : logs the clients, but using something nice
          room.clients.forEach((value: IClient, key: string) => {
            if (value.id === self.peer.id) return;

            console.log('connections')
            console.log(self.peer.connections);
            const connection = self.peer.connect(value.id);
            
            self.logger.writeLn(`Connected to ${value.id}`);
            // TODO
            // this.bindConnection(connection)
          });

          this.joinRoomCallback(room);

        } catch (error) {
          console.error(error);
          this.logger.writeLn(`An error occurred while attempting to join the room (${error.message}).`);
        }
        
        this.logger.prompt();
      });

    const createCommand = this.command('create');
    this.configureCommand(createCommand);
    createCommand
      // .alias('status')
      .description('Create a room')
      .argument('<room-name>', 'the name of the room')
      .option('-p, --password [password]', 'the password of the room')
      .action(async (roomName: string, password?: string) => {
        console.log('roomname: ' + roomName + ', password: ' + password);
        console.log(password);// FIXME : it is not null or undefined
        if (password !== null && password !== undefined) {
          console.log("not undefined nor null");
        }
        this.logger.newLine();
        // TODO : use RoomType here
        const room = {
          roomName: roomName,
          roomType: 0,
          password: ''
        }
        if (password !== undefined) {
          room.password = password;
        }
        try {
          console.log("creating room");
          const createdRoom = await this.roomManager.createRoom(room, this.peer.id);
          this.logger.writeLn(`The room was created (${formatRoomForCmdLine(createdRoom)})`);
        } catch (error) {
          this.logger.writeLn(`An error occurred while attempting to create the room (${error})`);
        }
        this.logger.prompt();
      });

    // TODO : init (using a factory)
  }

}
