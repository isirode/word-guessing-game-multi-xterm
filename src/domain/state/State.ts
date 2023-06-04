// FIXME : could I get rid of the enum by using a stack of states ?
// This system make it difficult to extend or evolve
// Maybe states should know to which states they can transition to
export enum StateEnum {
  InRoom,
  InOnlineGame,
  InOfflineGame,
  Offline
}

export interface State {
  // FIXME : can probably remove bind from the interface
  bind(): void;
  onExit: () => void;
}
