// FIXME : could I get rid of the enum by using a stack of states ?
// This system make it difficult to extend or evolve
// Maybe states should know to which states they can transition to
export enum StateEnum {
  InRoom,
  InOnlineGame,
  InOfflineGame,
  Offline
}

// Note : when leaving state, it will be an interval when the new state is there but the scope is still the old one
export interface StateChangeHandler {
  onLeaveState: () => void;
  changeState: (newState: State, formerState: State) => void;
}

export interface State {
  // handleData: (e: string) => void;
  // handleText: (e: string) => void;
  bind(): void;
}

export class EmptyState {
  handleData(e: string): void {

  }
  
  handleText(e: string): void {

  }
}
