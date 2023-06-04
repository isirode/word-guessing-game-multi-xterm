import { Logger } from "word-guessing-game-common";
import { IRoom, P2PRoom, RoomService, User } from "peerjs-room";
import * as Peer from 'peerjs';
import Emittery from "emittery";
import { IPingService } from "../../domain/ping/IPingService";
import prettyMilliseconds from 'pretty-ms';
import { ILogger, LoggerFactory } from "log4j2-typescript";

export interface RoomEventData {room: IRoom, peer: Peer};

export interface Events {
  joinedRoom: RoomEventData;
  createdRoom: RoomEventData;
  leavedRoom: undefined;
}

export type PeerProvider = () => Promise<Peer>;

// TODO : move it elsewhere ?
function formatRoomForCmdLine(room: IRoom) {
  // TODO : should log something else than an ugly id for the roomOwner
  return `id: ${room.roomId}, name: ${room.roomName}, owner: ${room.roomOwner?.id}, players: ${room.clients?.size}`;
}

export class RoomCommand {

  log4j2Logger: ILogger = LoggerFactory.getLogger('com.isirode.word-guessing.commands.RoomCommand');
  logger: Logger;
  roomService: RoomService;
  peerProvider: PeerProvider;

  events: Emittery<Events>;

  constructor(logger: Logger, roomManager: RoomService, peerProvider: PeerProvider) {
    this.logger = logger;

    this.roomService = roomManager;
    this.peerProvider = peerProvider;

    this.events = new Emittery();
  }

  async listRooms() {
    const rooms = await this.roomService.getRooms();
    this.logger.newLine();
    rooms.forEach((room, key) => {
      this.logger.writeLn(formatRoomForCmdLine(room));
    });
    this.logger.prompt();
  }

  async joinServerRoom(roomId: string, password: string) {
    this.log4j2Logger.debug('room: ' + roomId + ', password: ' + password)
    this.logger.newLine();
    try {
      const peer = await this.peerProvider();

      // Info : do not seem to be present if the import is not import Peer from 'peerjs'
      // console.log(peer._id);
      const room = await this.roomService.joinRoom(roomId, peer.id);
      if (!room) {
        console.log('did not join room');
        this.logger.writeLn('We were not able to join the room');
        return
      }
      this.log4j2Logger.debug('Room joined');

      this.events.emit('joinedRoom', {room, peer});

    } catch (error) {
      console.error(error);
      this.logger.writeLn(`An error occurred while attempting to join the room (${error.message}).`);
    }
    
    this.logger.prompt();
  }

  async createServerRoom(roomName: string, password?: string) {
    this.log4j2Logger.debug('roomname: ' + roomName + ', password: ' + password);
    this.log4j2Logger.debug(password);// FIXME : it is not null or undefined
    if (password !== null && password !== undefined) {
      this.log4j2Logger.debug("not undefined nor null");
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
      this.log4j2Logger.debug("creating room");
      // TODO : callback to return the peer
      const peer = await this.peerProvider();

      const createdRoom = await this.roomService.createRoom(room, peer.id);
      this.logger.writeLn(`The room was created (${formatRoomForCmdLine(createdRoom)})`);

      this.events.emit('createdRoom', {room: createdRoom, peer});
      // this.createdRoomCallback(createdRoom, peer);

    } catch (error) {
      this.logger.writeLn(`An error occurred while attempting to create the room (${error})`);
    }
    this.logger.prompt();
  }

  async leaveRoom(p2pRoom: P2PRoom) {
    // TODO : check if is game I suppose
    // TODO : clear room connection
    // TODO : send a message also ?

    await this.roomService.leaveCurrentRoom(p2pRoom.localUser.peer?.id);

    p2pRoom.disconnect();

    // TODO : transfer ownership
    // TODO : acquire ownership command
    // wordGameMulti = undefined;

    // Info : leaving the room will make the peer unfoundable on the server
    // So we need to either handle this
    // Or create another peer

    this.events.emit('leavedRoom');

    this.log4j2Logger.debug("has left");
  }

  async ping(pingService: IPingService) {
    this.log4j2Logger.debug('ping');

    try {
      const now = Date.now();
      const responses: number[] = await pingService.echo(now) as unknown as number[];
      const diffs: string[] = [];
      this.log4j2Logger.debug('ping responses', responses);
      for (let response of responses) {
        diffs.push(prettyMilliseconds(response - now));
      }

      if (diffs.length === 0) {
        this.log4j2Logger.info('Ping did not returned any answer', {term: true})
        return;
      }

      const message = `Ping result: ${diffs.join(', ')}`;

      this.log4j2Logger.info(message, {term: true});
    } catch (err: unknown) {
      this.log4j2Logger.warn('An error occurred while pinging', {term: true}, err as Error);
    }
  }

  whisper(id: string | undefined, name: string | undefined, message: string, p2pRoom: P2PRoom) {
    if (id !== undefined) {
      const user: User | undefined = p2pRoom.getUserByPeerId(id);
      if (user === undefined) {
        this.logger.writeLn(`The user of id '${id}' is not present in the room`);
        return;
      }
    }
    if (name !== undefined) {
      const user: User | undefined = p2pRoom.getUserByName(name);
      if (user === undefined) {
        this.logger.writeLn(`The user of name '${id}' is not present in the room`);
        return;
      }
      p2pRoom.sendTextMessage(user, message);
    }
    throw new Error(`either id or the name of the user need to be provided`);
  }

}