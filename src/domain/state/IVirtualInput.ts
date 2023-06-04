import Emittery from "emittery";

export interface NewCharacterEventData {
  char: string;
  virtualInput: IVirtualInput;
}

export interface Events {
  onNewCharacter: NewCharacterEventData;
}

// FIXME : should we imitate the DOM's API ?
export interface IVirtualInput {
  events: Emittery<Events>;
  
  value: string;
  feed: (char: string) => void;
  clear: () => void;
}