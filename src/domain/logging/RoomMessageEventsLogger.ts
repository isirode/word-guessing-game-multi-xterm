import { IClient, IRoom, Message, RenameUserMessage, TextMessage, User } from "peerjs-room";
import { Logger } from "word-guessing-game-common";
import { DataConnection } from 'peerjs';
import { formatError, formatPeerId, formatPeerName, formatRoomName, getFormattedRoomPrefix } from "./CommonLogging";

export class RoomMessageEventsLogger {

  logger: Logger;
  room: IRoom;
  user: User;

  constructor(logger: Logger, room: IRoom, user: User) {
    this.logger = logger;
    this.room = room;
    this.user = user;
  }
  
  // technical
  onConnectionEstablished(connection: DataConnection, user: User): void {
    this.logger.writeLn(`${this.getFormattedAdministration()}A connection was established with ${user.name}:${user.peer.id}`);
  }

  onConnectionClosed(connection: DataConnection, user: User): void {
    this.logger.writeLn(`${this.getFormattedAdministration()}A connection was closed (user: ${user.name}:${user.peer.id})`);
  }

  onConnectionError(connection: DataConnection, user: User, error: Error): void {
    this.logger.writeLn(`${this.getFormattedAdministration()}${formatError(error.message)}`);
  }

  onMissingConnections(missingConnections: IClient[]): void {
    this.logger.writeLn(`${this.getFormattedAdministration()}Not able to connect to all users, missing users:`);
    missingConnections.forEach((client: IClient) => {
      this.logger.writeLn(`Client: ` + client.id);
    });
  }

  onAllConnected(): void {
    this.logger.writeLn(`${this.getFormattedAdministration()}Successfully connected to all users of the room.`);
  }

  // messaging
  onTextMessage(connection: DataConnection, user: User, text: string, textMessage: TextMessage, root: Message): void {
    this.logger.writeLn(`${getFormattedRoomPrefix(this.room.roomName, user.name,user.peer.id)}${text}`);
  }

  onRenameUserMessage(connection: DataConnection, user: User, newName: string, formerName: string, renameUserMessage: RenameUserMessage, root: Message): void {
    this.logger.writeLn(`${this.getFormattedAdministration()}peer ${formatPeerName(connection.peer)} has renamed to ${newName} ` + (formerName.length === 0 ? '' : `(formerlly named ${formerName})`));
  }

  getFormattedRoomPrefix() {
    return getFormattedRoomPrefix(this.room.roomName, this.user.name, this.user.peer.id);
  }

  getFormattedAdministration() {
    return `(${formatRoomName(this.room.roomName)}:administration) : `
  }
}