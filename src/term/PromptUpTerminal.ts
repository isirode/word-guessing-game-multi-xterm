import { ITerminalInitOnlyOptions, ITerminalOptions, Terminal } from "xterm";

type Buffer = string | Uint8Array;

// FIXE : will be move to another repository

// Info : does not seem to exist
// Closest issue was https://github.com/xtermjs/xterm.js/issues/701
export class PromptUpTerminal extends Terminal {

  history: Buffer[]

  constructor(options?: ITerminalOptions & ITerminalInitOnlyOptions) {
    super(options);

    this.history = [];
  }

  reprompt(): void {
    return;
    // this.clear();
    // super.write('\x1b7');// This save the state of the cursor
    // const reversed = this.history.slice().reverse();
    // console.log(reversed);
    // for (let item of reversed) {
    //   console.log(item);
    //   super.write(item);
    // }
    // super.write('\x1b8');// This restore the state of the cursor
  }

  override write(data: string | Uint8Array, callback?: () => void): void {
    // Called for each elements (each prompt of a letter)
    // console.log("writing " + data);
    this.history.push(data);
    super.write(data, callback);
  }

  writeNoHistory(data: string | Uint8Array, callback?: () => void): void {
    // console.log("writenohistory " + data);
    super.write(data, callback);
  }


  // override writeln(data: string | Uint8Array, callback?: () => void): void {
  //   this.history.push(data);
  //   super.writeln(data, callback);
  // }

}
