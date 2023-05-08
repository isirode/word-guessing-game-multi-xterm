import { CmdDefinition, DefinedFlag, CmdResult, Awaitable } from "cmdy";

export class CmdDefinitionImpl implements CmdDefinition {
  name: string;
  description: string;
  displayName?: string;
  cmds?: CmdDefinition[];
  allowUnknownArgs?: boolean;
  allowUnknownFlags?: boolean;
  details?: string;
  alias?: string[];
  flags?: DefinedFlag[];
  group?: string;
  // Info : If not done this way, we will have the error below
  // Class 'CmdDefinitionImpl' defines instance member property 'exe', but extended class 'MyCmd' defines it as instance member function.
  // exe?: (cmd: CmdResult) => Awaitable<void>;
  exe?(cmd: CmdResult): Awaitable<void>;
}