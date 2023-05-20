import { CmdResult, Awaitable, ValueFlag } from "cmdy";
import { CmdDefinitionImpl } from "./CmdDefinitionImpl";
import { WordGameMulti } from "../../domain/WordGameMulti";
import { Logger } from "word-guessing-game-common";
import { Player } from "../../domain/models/Player";

class ListPlayersCmd extends CmdDefinitionImpl {

  logger: Logger;
  wordGameMulti: WordGameMulti;

  constructor(logger: Logger, wordGameMulti: WordGameMulti) {
    super();

    this.logger = logger;
    this.wordGameMulti = wordGameMulti;

    this.name = "ls";
    this.description = "List the players";

    this.exe = async (cmd) => await this.doExe(cmd);
  }

  // FIXME : support this syntax in a fork or PR
  // Error is command + commande + "not directly executeable!"
  async doExe(cmd: CmdResult): Promise<void> {
    console.log("connections");
    console.log(cmd.flags);
    console.log(cmd.valueFlags);

    // FIXME : should not be happening
    if (this.wordGameMulti === undefined) {
      this.logger.writeLn('You are not in game, there is no players to list.');
      return;
    }
    
    this.wordGameMulti.players.forEach((player: Player) => {
      this.logger.writeLn(`${player.user.name}:${player.user.peer.id} (score: ${player.score})`);
    });
  }
}

const id: ValueFlag = {
  name: "id",
  description: "Id of the player",
  shorthand: "i",
  types: ["string"],
  required: false,
}

// TODO : by name etc
class RemovePlayerCmd extends CmdDefinitionImpl {
  logger: Logger;
  wordGameMulti: WordGameMulti;

  constructor(logger: Logger, wordGameMulti: WordGameMulti) {
    super();

    this.logger = logger;
    this.wordGameMulti = wordGameMulti;

    this.name = "ls";
    this.description = "List the players";
    this.flags = [
      id,
    ]
  }

  override async exe(cmd: CmdResult): Promise<void> {
    console.log("remove");
    console.log(cmd.flags);
    console.log(cmd.valueFlags);

    // FIXME : should not be possible
    if (this.wordGameMulti === undefined) {
      this.logger.writeLn('You are not in game.');
      return;
    }

    const id: string = cmd.valueFlags['id'];

    if (id !== undefined) {
      this.wordGameMulti.removePlayerByPeerId(id);
    }
  }
}

export class PlayerCmd extends CmdDefinitionImpl {

  logger: Logger;
  wordGameMulti: WordGameMulti;

  listPlayersCmd: ListPlayersCmd;

  constructor(logger: Logger, wordGameMulti: WordGameMulti) {
    super();

    this.logger = logger;
    this.wordGameMulti = wordGameMulti;

    this.listPlayersCmd = new ListPlayersCmd(logger, wordGameMulti);

    this.name = "/players";
    this.description = "Command for the management of the players";

    this.cmds = [
      new ListPlayersCmd(logger, wordGameMulti),
      new RemovePlayerCmd(logger, wordGameMulti),
    ]

    this.exe = (cmd) => {
      this.listPlayersCmd.exe(cmd);
    }

  }

}