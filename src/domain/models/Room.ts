// TODO : use a lib
export enum RoomType {
  PUBLIC = 0,
  PRIVATE = 1,
  PROTECTED = 2
}

export interface IClient {
  id: string
  token: string
  socket: any
  lastPing: number
}

export interface IRoom {
  roomId: string
  roomName: string
  roomType: RoomType
  password: string
  roomOwner: IClient
  clients: Map<string, IClient>
}
