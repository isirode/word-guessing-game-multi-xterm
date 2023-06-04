import { Terminal } from 'xterm';
import { IVirtualInput, Events } from './IVirtualInput'
import Emittery from 'emittery';

// TODO : implement a default when pressing enter, maybe other values
// And allow to prevent it
export class VirtualInput implements IVirtualInput {

  events: Emittery<Events> = new Emittery();

  value: string = "";
  term: Terminal;

  protected _index: number = 0;
  protected get index(): number {
    return this._index;
  }
  protected set index(value: number) {
    if (value > this.value.length) {
      return;
    }
    if (value < -1) {
      return;
    }
    this._index = value
  }

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
      case '\x1b[D':// left arrow
        this.index -= 1;
        break;
      case '\x1b[C':// right arrow
        this.index += 1;
        break;
      default: // Print all other characters for demo
        if (char >= String.fromCharCode(0x20) && char <= String.fromCharCode(0x7E) || char >= '\u00a0') {
          this.index += 1;
          if (this.index < this.value.length) {
            this.value = setCharAt(this.value, this.index, char);
          } else {
            this.value += char;
          }
          this.term.write(char);
        } else {
          console.log(char);
        }
    }
    this.events.emit('onNewCharacter', {char, virtualInput: this});
  }

  clear(): void {
    this.value = "";
  }
  
}

// from Zachary Christopoulos
// https://stackoverflow.com/questions/1431094/how-do-i-replace-a-character-at-a-particular-index-in-javascript
// provided under SO apppropriate license
function setCharAt(str, index, chr) {
  if(index > str.length-1) return str;
  return str.substring(0,index) + chr + str.substring(index+1);
}
