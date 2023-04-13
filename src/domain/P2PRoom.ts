import prand from "pure-rand";// TODO : checkout other random libraries
import { Connection } from "./models/Connection";
import { IPeer, Peer } from "./models/Peer"
import * as PeerJS from 'peerjs'

export interface User {
  peer: IPeer;
  name: string;
}

// FIXME : did not find any good way to implement it
export interface LocalUser extends User {
  peer: Peer;
  name: string;
}

// Info : we add a circular reference issue
// For now, we are doing this
// TODO : find a good library, one which respect interfaces
export function sanitizeUser(user: User) {
  const result: User = {
    peer: {
      id: user.peer.id
    },
    name: user.name,
  };
  return result;
};

// how do we handle messages
// message are handled on data
// then we deserialize
// then we cast the body

//#region 'Messaging Protocol'

// TODO : add app version and protocole version in the message

// Info : We use a model where the application will implement its own messaging on top on the base one
export enum MessageType {
  Room = 'Room',
  App = 'App'
}

export class Message {
  type: MessageType;
  from: User;
  payload: AnyMessage;
}

// Info : using an empty interface so that we do not use any, for now
export interface AnyMessage {

}

export enum RoomMessageType {
  Text = 'Text',
  RenameUser = 'RenameUser'
}

export class RoomMessage implements AnyMessage {
  type: RoomMessageType;
  payload: AnyMessage;
}

export class TextMessage implements AnyMessage {
  text: string;
}

export class RenameUserMessage implements AnyMessage {
  formerName: string;
  newName: string;
}

export function getApplicationMessage(from: User, payload: AnyMessage): Message {
  return {
    type: MessageType.App,
    from: from,
    payload: payload,
  };
}

//#endregion

// TODO : replace by an event bus ?
// FIXME : is declaring user as User or undefined necessary ?
export interface RoomMessageHandler {
  // technical
  onConnectionEstablished: (connection: PeerJS.DataConnection, user: User) => void;
  onConnectionClosed: (connection: PeerJS.DataConnection, user: User) => void;
  onConnectionError: (connection: PeerJS.DataConnection, user: User, error: any) => void;
  // messaging
  onTextMessage: (connection: PeerJS.DataConnection, user: User | undefined, text: string, textMessage: TextMessage, root: Message) => void;
  onRenameUserMessage: (connection: PeerJS.DataConnection, user: User | undefined, newName: string, formerName: string, renameUserMessage: RenameUserMessage, root: Message) => void;
}

export interface AppMessageHandler {
  onAppMessage: (user: User | undefined, message: AnyMessage, root: Message) => void;
}

// TODO : ensure unique name setting

// TODO : use a room model object ?

// TODO : implement ownership ?

// should be able to handle chatting and switching to a game or a specialized room
export class P2PRoom {

  localUser: LocalUser;

  users:  Map<string, User> = new Map();

  names: string[] = [];

  // PeerJS connections are not typed
  connections: Map<string, Connection> = new Map();

  roomMessageHandler: RoomMessageHandler;

  appMessageHandler: AppMessageHandler;

  constructor(localUser: LocalUser, roomMessageHandler: RoomMessageHandler, appMessageHandler: AppMessageHandler, names: string[] = []) {
    this.localUser = localUser;
    this.roomMessageHandler = roomMessageHandler;
    this.appMessageHandler = appMessageHandler;
    this.names = names;

    this.users.set(localUser.peer.id, localUser);

    this.bindPeer();
  }

  public broadcast (message: Message) {
    console.log('connections : ' + this.connections.size);
    this.connections.forEach(connection => {
      console.log(`Sending message to ${connection.peer}`);
      connection.send(JSON.stringify(message));
    });
  }

  public broadcastApplicationMessage(message: AnyMessage) {
    const rootMessage = {
      type: MessageType.App,
      from: this.getUserPayload(this.localUser),
      payload: message,
    } as Message;
    this.broadcast(rootMessage);
  }

  public bindPeer() {
    const self = this;

    // TODO : use a common method for both sides of connections
    // This is not called when we are the ones opening the connection
    this.localUser.peer.base.on('connection', (connection: PeerJS.DataConnection) => {
      console.log('connection');
      console.log(connection);
      this.bindConnection(connection);
      // FIXME : put this in connection.on('open') ?
      // peer.connections.set(connection.peer, new Connection(connection))
    });
  }

  public bindConnection (connection: PeerJS.DataConnection) {
    // FIXME ; remove it or set it back if necessary
    const self = this;
    console.log('binding connection');
    console.log('peer ' + connection.peer);

    // this.connections.set(connection.peer, new Connection(connection));

    // TODO : replace strings events by an enum
    connection.on('open', () => {
      console.log('connection open to ' + connection.peer);

      this.connections.set(connection.peer, new Connection(connection));

      // Init a user
      const peer = {
        id: connection.peer
      } as IPeer;

      const user = {
        peer: peer,
        name: this.getRandomUninitializedName()
      } as User;

      this.users.set(peer.id, user);

      this.roomMessageHandler.onConnectionEstablished(connection, user);

      // Info : to synchronize the names
      this.sendRenameMessage(this.localUser.name, '');
    });
    connection.on('data', (data) => {
      console.log("Data received");
      console.log(data);
      this.handleMessage(connection, data);
    });
    // TODO : (duplicate function) move this into a method with all the bindings
    connection.on('close', () => {
      console.log('connection closed');

      // FIXME : remove the user from the room server side too ?

      // TODO : rename peer of connection in either a Peer or peerId

      let user = this.users.get(connection.peer);

      this.users.delete(connection.peer);

      this.connections.delete(connection.peer);

      this.roomMessageHandler.onConnectionClosed(connection, user);

      // TODO : unit test that we never call this.api.leaveRoom ?
      // this.api.leaveRoom(this.room.roomId, this.peer.id)
      // this.pushMessage(new Message('(info)', this.localeMessaging.formatPeerHasDisconnected(connection.peer), ''))
    });
    // Seems to be never called
    connection.on('error', function (error) {
      console.log('connection : error received');
      console.log(error);

      let user = this.users.get(connection.peer);
      
      this.roomMessageHandler.onConnectionError(connection, error);
    });
  }

  public handleMessage (connection: PeerJS.DataConnection, data: any) {
    console.log('handleMessage');
    console.log(data);

    const message: Message = JSON.parse(data) as Message;

    let user: User = this.getUserByPeerId(message.from.peer.id);
    if (user === undefined) {
      console.warn("user is undefined");
    }

    // TODO : move all that into separate methods ?
    // TODO : put message formatting into separate class, can then translate it into fr / en
    switch (message.type) {
      case MessageType.Room:
        const roomMessage = message.payload as RoomMessage;
        this.handleRoomMessage(connection, user, roomMessage, message);
        break;
      case MessageType.App:
        const appMessage = message.payload;
        this.appMessageHandler.onAppMessage(user, appMessage, message);
        break;
      default:
        throw new Error('unknown peer message type')
    }
  }

  protected handleRoomMessage(connection: PeerJS.DataConnection, user: User | undefined, message: RoomMessage, root: Message) {
    switch (message.type) {
      case RoomMessageType.Text:
        const textMessage = message.payload as TextMessage;
        this.roomMessageHandler.onTextMessage(connection, user, textMessage.text, textMessage, root);
        break;
      case RoomMessageType.RenameUser:
        const renameMessage = message.payload as RenameUserMessage;
        if (user !== undefined) {
          user.name = renameMessage.newName;
        }
        this.roomMessageHandler.onRenameUserMessage(connection, user, renameMessage.newName, renameMessage.formerName, renameMessage, root);
        break;
      default:
        throw new Error("unknown room message type");
    }
  }

  public sendMessage (text: string) {

    const textMessage: TextMessage = {
      text: text,
    };
    const roomMessage: RoomMessage = {
      type: RoomMessageType.Text,
      payload: textMessage,
    }
    // TODO : provide helpers for this
    const message: Message = {
      type: MessageType.Room,
      from: this.getUserPayload(this.localUser),
      payload: roomMessage,
    };

    // Info : we display the message
    // FIXME : this can be improved
    this.roomMessageHandler.onTextMessage(
      undefined,
      this.localUser,
      text,
      textMessage,
      message
    );

    this.broadcast(message);
  }

  public sendRenameMessage(newName: string, formerName: string) {
    const renameMessage: RenameUserMessage = {
      newName: newName,
      formerName: formerName,
    }
    const roomMessage: RoomMessage = {
      type: RoomMessageType.RenameUser,
      payload: renameMessage,
    }
    const message: Message = {
      type: MessageType.Room,
      from: this.getUserPayload(this.localUser),
      payload: roomMessage,
    };

    this.broadcast(message);
  }

  public disconnect() {
    this.connections.forEach(connection => {
      console.log('closing connection ' + connection.peer);
      connection.close();
    });
    this.connections.clear();
  }

  public getUser(peerId: string): User {
    return this.users.get(peerId);
  }

  // Info : necessary to avoid a circular dependency issue with the JSON serialization
  // Not sure why
  // FIXME : remedy this
  protected getUserPayload(localUser: LocalUser): User {
    const user: User = {
      peer: {
        id: localUser.peer.id
      },
      name: localUser.name,
    };
    return user;
  }

  // TODO : maybe use a class for this
  getRandomUninitializedName() {
    const seed = Date.now() ^ (Math.random() * 0x100000000);
    const rng = prand.xoroshiro128plus(seed);
    const randomValue = prand.unsafeUniformIntDistribution(1, 999, rng);
    return `uninitialized-${randomValue}`;
  }

  getRandomName(): string {
    // TODO : generate a ano name if names is empty
    return this.names[Math.floor(Math.random() * this.names.length)];
  }

  getUserByPeerId(peerId: string): User | undefined {
    return this.users.get(peerId);
  }
}
