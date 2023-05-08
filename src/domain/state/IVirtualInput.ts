
// FIXME : should we imitate the DOM's API ?
export interface IVirtualInput {
  value: string;
  feed: (char: string) => void;
  // FIXME : this should be a bus or similar
  onNewCharacter: (char: string, virtualInput: IVirtualInput) => void;
  clear: () => void;
}