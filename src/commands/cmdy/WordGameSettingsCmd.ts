import { Logger } from "word-guessing-game-common";
import { WordGameMulti } from "../../domain/WordGameMulti";
import { CmdDefinitionImpl } from "./CmdDefinitionImpl";
import { CmdResult, ValueFlag } from "cmdy";

class WordGameSettingsHelpCmd extends CmdDefinitionImpl {

  logger: Logger;
  wordGameMulti: WordGameMulti;

  constructor(logger: Logger, wordGameMulti: WordGameMulti) {
    super();

    this.logger = logger;
    this.wordGameMulti = wordGameMulti;

    this.name = "help";
    this.description = "Display the properties that you can modify";

    this.exe = async (cmd) => await this.doExe(cmd);
  }

  async doExe(cmd: CmdResult): Promise<void> {
    console.log("helpSettings");
    console.log(cmd.flags);
    console.log(cmd.valueFlags);

    if (this.wordGameMulti === undefined) {
      this.logger.writeLn('You are not in game.');
      return;
    }

    this.logger.writeLn('The settings are : '+ Object.getOwnPropertyNames(this.wordGameMulti.settings).join(', '))
  }

}

const property: ValueFlag = {
  name: "prop",
  description: "Property to update",
  shorthand: "p",
  types: ["string"],
  required: true,
}

export class ModifySettingsCmd extends CmdDefinitionImpl {

  logger: Logger;
  wordGameMulti: WordGameMulti;

  constructor(logger: Logger, wordGameMulti: WordGameMulti) {
    super();

    this.logger = logger;
    this.wordGameMulti = wordGameMulti;

    this.name = "set";
    this.description = "Allow to modify a setting";

    this.flags = [
      property,
    ]
  }

  async exe(cmd: CmdResult): Promise<void> {
    console.log("modifySettings");
    console.log(cmd.flags);
    console.log(cmd.valueFlags);

    if (this.wordGameMulti === undefined) {
      this.logger.writeLn('You are not in game.');
      return;
    }

    const prop: string = cmd.valueFlags['prop'];

    if (prop !== undefined) {
      const splitted = prop.split('=');
      if (splitted.length !== 2) {
        console.warn("prop " + prop + " is not correctly formatted");
        return;
      }
      try {
        this.wordGameMulti.modifySettingsProperty(splitted[0], splitted[1]);
      } catch (error) {
        console.error(error);
        console.log(Object.getOwnPropertyNames(this.wordGameMulti.settings));
        this.logger.writeLn('An error occurred');
        this.logger.writeLn('Maybe, you did not type a correct key, try with one of these: '+ Object.getOwnPropertyNames(this.wordGameMulti.settings).join(', '))
      }
    }
  }

}

export class WordGameSettingsCmd extends CmdDefinitionImpl {

  logger: Logger;
  wordGameMulti: WordGameMulti;

  constructor(logger: Logger, wordGameMulti: WordGameMulti) {
    super();

    this.logger = logger;
    this.wordGameMulti = wordGameMulti;

    this.name = "/settings";
    this.description = "Modify the settings of the game";
    this.cmds = [
      new WordGameSettingsHelpCmd(logger, wordGameMulti),
      new ModifySettingsCmd(logger, wordGameMulti),
    ]
  }

}

// TODO : checkout if can put a value argument without a name, positional

