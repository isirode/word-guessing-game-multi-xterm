import { Terminal } from 'xterm';
import { IVirtualInput } from './IVirtualInput'

// TODO : implement a default when pressing enter, maybe other values
// And allow to prevent it
export class VirtualInput implements IVirtualInput {
  value: string = "";
  term: Terminal;

  constructor(term: Terminal) {
    this.term = term;
  }

  feed(char: string): void {
    // console.log("ondata " + e);
    // TODO : use a special character enum provider
    switch (char) {
      case '\u007F': // Backspace (DEL)
        // Do not delete the prompt

        // Info : those are not available in typescript
        //if (term.buf_core.buffer.x > 2) {
        //if (term.buffer.x > 2) {
        if (this.value.length > 0) {
          // FIXME : I was using own term for this (PromptUpTerminal)
          this.term.write('\b \b');
          this.value = this.value.substr(0, this.value.length - 1);
        }
        break;
      default: // Print all other characters for demo
        if (char >= String.fromCharCode(0x20) && char <= String.fromCharCode(0x7E) || char >= '\u00a0') {
          this.value += char;
          this.term.write(char);
        }
    }
    this.onNewCharacter(char, this);
  }

  onNewCharacter(char: string, virtualInput: IVirtualInput): void {

  }

  clear(): void {
    this.value = "";
  }
  
}