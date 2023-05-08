import prand from "pure-rand";// TODO : checkout other random libraries
import { Connection } from "./models/Connection";
import { IPeer, Peer } from "./models/Peer"
import * as PeerJS from 'peerjs'
import { IClient, IRoom } from "./models/Room";

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

// TODO : add possibility to add application level messages at the root ? based on an option
// It would improve performance, lightly

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
  onAttemptingConnections: (room: IRoom) => void;
  onConnectionEstablished: (connection: PeerJS.DataConnection, user: User) => void;
  onConnectionClosed: (connection: PeerJS.DataConnection, user: User) => void;
  onConnectionError: (connection: PeerJS.DataConnection, user: User, error: any) => void;
  onMissingConnections: (clients: IClient[]) => void;
  onAllConnected: () => void;
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

  room: IRoom;

  users:  Map<string, User> = new Map();

  names: string[] = [];

  // PeerJS connections are not typed
  connections: Map<string, Connection> = new Map();

  roomMessageHandler: RoomMessageHandler;

  appMessageHandler: AppMessageHandler;

  constructor(localUser: LocalUser, room: IRoom, roomMessageHandler: RoomMessageHandler, appMessageHandler: AppMessageHandler, names: string[] = []) {
    this.localUser = localUser;
    this.room = room;
    this.roomMessageHandler = roomMessageHandler;
    this.appMessageHandler = appMessageHandler;
    this.names = names;

    this.users.set(localUser.peer.id, localUser);

    this.bindPeer();

    this.connectToClients();

    setTimeout(() => {
      let successful = this.verifyRoomConnections();
      // TODO : initiate the echo here
    }, 10 * 1000);// TODO : make it configurable
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
      this.bindConnection(connection, true);
      // FIXME : put this in connection.on('open') ?
      // peer.connections.set(connection.peer, new Connection(connection))
    });
  }

  public bindConnection (connection: PeerJS.DataConnection, isEstablished: boolean) {
    // Info : this method is called when we are attempting to bind an user
    // And when we have received a connection

    // TODO : compare the room clients and the connections here

    console.log("connection state");
    console.log(connection.peerConnection.connectionState);
    console.log("connection reliable: " + connection.reliable);
    console.log("established: " + isEstablished);
    
    // FIXME ; remove it or set it back if necessary
    const self = this;
    console.log('attempt to bind connection');
    console.log('peer ' + connection.peer);

    // this.connections.set(connection.peer, new Connection(connection));

    // TODO : replace strings events by an enum
    connection.on('open', () => {
      console.log('connection opened to ' + connection.peer);

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

  public connectToClients() {
    this.room.clients.forEach((client: IClient, peerId: string) => {
      if (client.id === this.localUser.peer.id) return;

      console.log('connections');
      console.log(this.localUser.peer.base.connections);

      const connection = this.localUser.peer.base.connect(client.id);

      // TODO : unit test to add to check we are not adding the connection here (at this level, it could failed at this point)
      // this.connections.set(connection.peer, new Connection(connection))
      // TODO : display the connection on 'connecting' et indiquer connected / failed|error
      this.bindConnection(connection, false);
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

  // TODO : we are not handling the case connection followed by disconnection
  protected verifyRoomConnections(): boolean {
    const missingConnections = [];

    if (this.connections.size > this.room.clients.size) {
      console.warn("too many connections compared to the room");
      console.log("room.clients.size: " + this.room.clients.size);// TODO : method to map a Map to something else
      console.log("room.clients:");
      this.room.clients.forEach((x, k) => {
        console.log(x.id);
      });
      console.log("connections.size: " + this.connections.size);
      console.log("connections:");
      this.connections.forEach((connection, k) => {
        console.log(connection.peer);
        if (connection._connection.reliable) {
          console.warn(`Connection ${connection.peer} is not marked as reliable but is marked as connected`);
        }
      });
    }

    this.room.clients.forEach((client: IClient, id: string) => {
      if (id === this.localUser.peer.id) return;

      if (this.users.get(id) === undefined) {
        missingConnections.push(client);
      }
    });
    if (missingConnections.length === 0) {
      this.roomMessageHandler.onAllConnected();
      return true;
    } 
    else {
      this.roomMessageHandler.onMissingConnections(missingConnections);
      return false;
    }
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
