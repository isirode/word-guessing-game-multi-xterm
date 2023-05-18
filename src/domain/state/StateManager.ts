import { Terminal } from "xterm";
import { Logger } from "word-guessing-game-common";
import { State } from "./State";
import { IVirtualInput } from "./IVirtualInput";
import { OutputConfiguration } from "commander";

type StateOrStateProvider =  State | (() => State);

// FIXME : rename it StateRegister or similar ?
export class StateRegister {

  currentState: State;
  states: Map<string, StateOrStateProvider> = new Map();

  register(name: string, state: StateOrStateProvider) {
    if (this.states.has(name)) {
      throw new Error(`A state named ${name} is already stored.`);
    }
    this.states.set(name, state);
    console.log("Setted state " + name);
    // console.log(this.states.get(name));
    // console.log(this.states[name]);
  }

  async changeTo(name: string) {
    let stateOrProvider: StateOrStateProvider = this.states.get(name);
    if (stateOrProvider === undefined) {
      console.warn("States count : " + this.states.size);
      throw new Error(`State ${name} not found`);
    }
    let state: State;
    if (typeof stateOrProvider === 'function') {
      // WARN : do not remove the await here
      state = await stateOrProvider();
    } else {
      state = stateOrProvider;
    }
    this.currentState = state;
  }
}

export class StateManager {

  stateRegister: StateRegister;

  promtTerm: Terminal;
  messageTerm: Terminal;

  input: IVirtualInput;

  logger: Logger;

  constructor(promptTerm: Terminal, messageTerm: Terminal, input: IVirtualInput, logger: Logger, configuration: OutputConfiguration) {
    this.promtTerm = promptTerm;
    this.messageTerm = messageTerm;
    this.input = input;
    this.logger = logger;

    this.stateRegister = new StateRegister();
  }
}
