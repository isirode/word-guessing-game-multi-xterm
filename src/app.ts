import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

import { Command, OutputConfiguration } from 'commander';
import { Flag, BoolFlag, ValueFlag, parseCmd, CmdDefinition } from "cmdy";

import { DatabaseCommand, WordGameCommand, Logger, FrenchWordDatabase } from 'word-guessing-game-common';
import { GuessResult, WordGame, WordGameOptions } from 'word-guessing-lib';

import { Config, buildConfig } from './config/Config';
import { PeerJSServerClient } from './domain/adapters/secondary/api/PeerJSServerClient';
import { RoomCommand } from './commands/RoomCommand';
import { createPeer } from './peer';
import { PromptUpTerminal } from './term/PromptUpTerminal';
import { RoomManager } from './domain/RoomManager';
import { WordGameMessageHandler, WordGameMulti } from './domain/WordGameMulti';
import { IClient, IRoom } from './domain/models/Room';
import { ITimer } from './domain/models/Timer';
import { IWordGameMultiSettings } from './domain/ports/secondary/IWordGameMultiSettings';
import { WordGameMessagingEN } from './domain/adapters/secondary/locale/WordGameMessagingEN';
import { SetRoomAdminMessage, WordGameMessage, WordGameMessageType } from './domain/models/Message';
// import Peer = require('peerjs');
import * as PeerJS from 'peerjs';
import { Connection } from './domain/models/Connection';
import { AnyMessage, AppMessageHandler, LocalUser, Message, P2PRoom, RenameUserMessage, RoomMessageHandler, TextMessage, User } from './domain/P2PRoom';
import { Peer } from './domain/models/Peer';
import { Player } from './domain/models/Player';

// TODO : fix the blink cursor

// from https://github.com/xtermjs/xtermjs.org/blob/281b8e0f9ac58c5e78ff5b192563366c40787c4f/js/demo.js
// MIT license
var baseTheme = {
  foreground: '#F8F8F8',
  background: '#2D2E2C',
  selection: '#5DA5D533',
  black: '#1E1E1D',
  brightBlack: '#262625',
  red: '#CE5C5C',
  brightRed: '#FF7272',
  green: '#5BCC5B',
  brightGreen: '#72FF72',
  yellow: '#CCCC5B',
  brightYellow: '#FFFF72',
  blue: '#5D5DD3',
  brightBlue: '#7279FF',
  magenta: '#BC5ED1',
  brightMagenta: '#E572FF',
  cyan: '#5DA5D5',
  brightCyan: '#72F0FF',
  white: '#F8F8F8',
  brightWhite: '#FFFFFF',
};

const columnCount = 140;

function getTermConf() {
  const termConf = {
    fontFamily: '"Cascadia Code", Menlo, monospace',
    theme: baseTheme,
    cursorBlink: true,
    allowProposedApi: true,
    cols: columnCount
  };
  return termConf;
}

// Info : we do it this instead of making a framework for handling this kind of situations
// var term = new Terminal(termConf);
const scoreTermConf = getTermConf();
scoreTermConf.cursorBlink = false;
const scoreTerm = new Terminal(scoreTermConf);
// TODO : an API or equivallent for this kind of stuff ; this hide the cursor
// Info : \e does not work
scoreTerm.write('\x1B[?25l');

const promptTerm = new PromptUpTerminal(getTermConf());

const messageTermConf = getTermConf();
messageTermConf.cursorBlink = false;
const messageTerm = new Terminal(messageTermConf);
messageTerm.write('\x1B[?25l');

// var testTerm = new Terminal(termConf);

// const targetElementId = 'terminal';

// const scoreElementId = 'scoreTerm';
const promptElementId = 'promptTerm';
const messageElementId = 'messageTerm';

const testElementId = 'testTerm'

//const fitAddon = new FitAddon();

function commonTermSetup(term: Terminal, elementId: string) {
  // Info : top element need a fixed size to use percentage down the hierarchy
  // FIXME : this is adding empty white space at the bottom of the element
  // I do know which property it is matching, it is the wayt the fit addon compute the size
  // But if we do not use it, the scrollbar is not present
  // And so, we cannot scroll to bottom
  // See https://github.com/xtermjs/xterm.js/issues/4430
  // It seem intended
  const fitAddon = new FitAddon();
  // I think it does not support percentages
  // Need to fit an height actually
  term.loadAddon(fitAddon);

  let targetElement = document.getElementById(elementId);
  if (targetElement != null) {
    term.open(targetElement);
  } else {
    throw new Error('The document does not contain an element of id ' + elementId);
  }

  fitAddon.fit();

  // Info : does not work
  // Open the debugger in the browser, refresh, close the debugger : huge empty white spaces
  term.onResize(x => {
    // console.log("on term resize");
    fitAddon.fit();
  });
  /* FIXME : error below, I was using the chrome debugger
  p.ts:132 RangeError: Maximum call stack size exceeded
    at a.e (OptionsService.ts:105:21)
    at e.Terminal.i (Terminal.ts:35:25)
    at t.FitAddon.proposeDimensions (FitAddon.ts:68:51)
    at t.FitAddon.fit (FitAddon.ts:36:23)
    at app.ts:123:14
    at t.EventEmitter.fire (EventEmitter.ts:55:16)
    at EventEmitter.ts:68:23
    at t.EventEmitter.fire (EventEmitter.ts:55:16)
    at c.resize (BufferService.ts:47:20)
    at I.resize (CoreTerminal.ts:183:25)
*/

  // Info : this does work (empty white space are 'normally' sized)
  function onResize() {
    try {
      // console.log('onResize');
      fitAddon.fit();
    } catch (e) {
      console.error(e)
    }
  }

  window.addEventListener("resize", onResize);
}

// commonTermSetup(scoreTerm, scoreElementId);
commonTermSetup(promptTerm, promptElementId);
commonTermSetup(messageTerm, messageElementId);

// commonTermSetup(testTerm, testElementId);


const program = new Command();

program
  // Info : if you set it, you will need to pass it as a parameter
  // If you do not set it, it will appear in the help command anyway
  // There is something weird actually
  // FIXME : 'run etc' is also working
  .name('/run')
  .description('CLI to execute commands')
  .version('0.0.1');

function writeNewLine() {
  messageTerm.write('\r\n');
}

// TODO : use an option that make sure it is declared before it is used
var command = '';

function configureCommand(command: Command) {
  // command.showHelpAfterError();
  command.configureOutput(configuration);
  command.exitOverride(/*(err) => {
    console.log("attempting to exit");
  }*/);
}

// TODO : checkout why I've putted a application-message event on PeerJS fork

const config = buildConfig();
const peer = createPeer(config);

console.log(process.env.PEER_SERVER_HOSTNAME);
console.log(config);
console.log(peer);

const peerJSClient = new PeerJSServerClient({
  host: config.peerServerHostname,
  port: config.peerServerPort
});

const roomManager = new RoomManager(peerJSClient);

// TODO : move it an util or find an equivalent lib
function isNullOrUndefined(object: any) {
  return object === null || object === undefined;
}

function isInRoom() {
  return !isNullOrUndefined(roomManager.currentRoom);
}

function getRoomPrefix(): string {
  let value = '';
  if (isInRoom()) {
    value += '(' + roomManager.currentRoom.roomName;
    if (localUser !== null) {
      value += ':' + localUser.name + ':' + localUser.peer.id;
      // TODO : log conditionally ID
    }
    value += ') ';
  }
  return value;
}

function getFormattedRoomPrefix(): string {
  let value = '';
  if (isInRoom()) {
    value += '(' + formatRoomName(roomManager.currentRoom.roomName);
    if (localUser !== null) {
      value += ':' + formatPeerName(localUser.name) + ':' + formatPeerId(localUser.peer.id);
      // TODO : log conditionally ID
    }
    value += ') : ';
  }
  return value;
}

function prompt() {
  // TODO : conditional \r\n, some errors have one at the end, it produce two carriage return
  // command = '';
  let value = '\r\n';
  value += getRoomPrefix();
  value += '$ ';
  promptTerm.write(value);

  promptTerm.reprompt();
}

function writeLn(text: string) {
  // the new line character of commander is not the one supported by xterm
  messageTerm.writeln(text.replace(/\n/g, '\r\n'));
}

function writeOut(output: string) {
  writeNewLine();

  writeLn(output);

  prompt();
}

// FIXME : print in red
function writeErr(err: string | Error) {
  writeNewLine();

  console.error(err);

  if (err instanceof Error) {
    writeLn(err.message);
  } else {
    writeLn(err);
  }

  prompt();
}

// TODO : print warn

const configuration: OutputConfiguration = {
  writeOut: writeOut,
  writeErr: writeErr,
  getOutHelpWidth: () => {
    return columnCount;
  },
  getErrHelpWidth: () => {
    return columnCount;
  }
};

const logger: Logger = {
  info: writeOut,
  error: writeErr,
  writeLn: writeLn,
  newLine: writeNewLine,
  prompt: prompt,
}

function initWordGameMulti(): WordGameMulti {
  return new WordGameMulti(roomManager.currentRoom, wordGame, p2pRoom, new WordGameMessagingEN(), wordGameSettings, wordGameMessageHandler);
}

// Cmdy commands

// TODO : checkout if can put a value argument without a name, positional

const force: BoolFlag = {
  name: "force",
  shorthand: "f",
  description: "Forcibly execute the command",
}

const gameType: ValueFlag = {
  name: "game",
  description: "Precise the type of game to start",
  shorthand: "g",
  types: ["string"],
  required: false,
}

// TODO : create a set game command ?
const start: CmdDefinition = {
  name: "/start",
  description: "Start a game",
  flags: [
    gameType
  ],
  allowUnknownArgs: false,
  exe: async (res) => {
    console.log("start");
    console.log(res.flags);
    console.log(res.valueFlags);

    const game: string = res.valueFlags['game'];

    if (game === 'word' || game === 'word-guessr' || game === undefined) {
      console.log('yeah');

      wordGameMulti = initWordGameMulti();
      wordGameMulti.startGame();

    } else {
      logger.writeLn(formatWarn(`The game '${game}' is not recognized`));
    }
  }
}

// const game: CmdDefinition = {
//   name: "/game",
//   description: "Set a game",
//   flags: [
//   ],
//   allowUnknownArgs: false,
//   exe: async (res) => {
//     console.log("start");
//     console.log(res.flags);
//     console.log(res.valueFlags);
//   }
// }

const leave: CmdDefinition = {
  name: "/leave",
  description: "Allow to leave the room",
  flags: [
      force
  ],
  exe: async (res) => {
    console.log("leave");
    console.log(res.flags);
    console.log(res.valueFlags);
    
    // TODO : check if is game I suppose

    // TODO : clear room connection

    // TODO : send a message also ?

    await roomManager.leaveCurrentRoom(peer.id);

    if (p2pRoom) {
      p2pRoom.disconnect();
      p2pRoom = null;
    }

    // TODO : transfer ownership
    // TODO : acquire ownership command
    wordGameMulti = undefined;

    console.log("has left");
  }
}

const connections: CmdDefinition = {
  name: "/connections",
  description: "List connections",
  flags: [
      // TODO : peer, game, P2PRoom
  ],
  exe: async (res) => {
    console.log("connections");
    console.log(res.flags);
    console.log(res.valueFlags);
    
    p2pRoom?.connections.forEach((value: Connection, key: string) => {
      const user = p2pRoom.getUser(key);
      logger.writeLn(`${formatRoomName(roomManager.currentRoom?.roomName)}:${key}:${user.name}`);
    });
  }
}

const players: CmdDefinition = {
  name: "/players",
  description: "List players",
  flags: [
  ],
  exe: async (res) => {
    console.log("connections");
    console.log(res.flags);
    console.log(res.valueFlags);

    if (wordGameMulti === undefined) {
      logger.writeLn('You are not in game, there is no players to list.');
      return;
    }
    
    wordGameMulti.players.forEach((player: Player) => {
      logger.writeLn(`${player.user.name}:${player.user.peer.id} (score: ${player.score})`);
    });
  }
}

const root: CmdDefinition = {
  name: "",
  description: "",
  cmds: [
      start,
      leave,
      connections,
      players,
  ],
   flags: [
      // version
  ],
  //exe: async () => console.log("")
}

const wordGameSettings = {
  minOccurences: 250,
  maxOccurences: 1000,
  guessAsSession: true,
  maxAttempts: 5,
  // multi
  winningScore: 10,
  timePerGuess: 30,
} as IWordGameMultiSettings;

var wordGame: WordGame | null;

var wordGameMulti: WordGameMulti | null;
var p2pRoom: P2PRoom | null;

// FIXME : either remove this or solve the timer issue
class SimpleTimer implements ITimer {

  startTimer(): void {
    throw new Error('Method not implemented.');
  }
  clearInterval(): void {
    throw new Error('Method not implemented.');
  }
  
}

// TODO
// could use a state machine
// with fallbacks
// for parsing the input

const resetSequence = '\x1b[0m';

const blueFont = '\x1B[34m';
const orangeFont = '\x1B[196m';
const redFont = '\x1B[202m';
const greenFont = '\x1B[2m';// FIXME : should be green but is not
const green2Font = '\x1B[34m';// FIXME : should be green but is not
const greyFont = '\x1B[8m';
const yellowFont = '\x1B[226m';

function formatRoomName(room: string) {
  return green2Font + room + resetSequence;
}

// TODO : allow to select it
function formatPeerName(peer: string) {
  return blueFont + peer + resetSequence;
}

function formatPeerId(peerId: string) {
  return yellowFont + peerId + resetSequence;
}

function formatWarn(text: string) {
  return orangeFont + text + resetSequence;
}

function formatError(text: string) {
  return redFont + text + resetSequence;
}

const roomMessageHandler: RoomMessageHandler = {
  onConnectionEstablished: function (connection: PeerJS.DataConnection, user: User): void {
    logger.writeLn(`${getFormattedRoomPrefix()}A connection was established`);
  },
  onConnectionClosed: function (connection: PeerJS.DataConnection, user: User): void {
    logger.writeLn(`${getFormattedRoomPrefix()}A connection was closed`);
  },
  onConnectionError: function (connection: PeerJS.DataConnection, user: User, error: any): void {
    logger.writeLn(`${getFormattedRoomPrefix()}${formatError(error.message)}`);
  },
  onTextMessage: function (connection: PeerJS.DataConnection, user: User, text: string, textMessage: TextMessage, root: Message): void {
    logger.writeLn(`${getFormattedRoomPrefix()}${text}`);
  },
  onRenameUserMessage: function (connection: PeerJS.DataConnection, user: User, newName: string, formerName: string, renameUserMessage: RenameUserMessage, root: Message): void {
    logger.writeLn(`peer ${formatPeerName(connection.peer)} has renamed to ${newName} ` + (formerName.length === 0 ? '' : `(formerlly named ${formerName})`));
  }
};

const appMessageHandler: AppMessageHandler = {
  onAppMessage: function (user: User, message: AnyMessage, root: Message): void {
    logger.writeLn(`(${formatPeerName(user.name)}) : ${formatWarn("received an application level message but there is no handling for this")}`);

    // Info : we try to start the game if necessary
    // TODO : another phase / messaging stack for this
    // pick game or something
    if (user.peer.id === roomManager.currentRoom.roomOwner.id) {
      const wordGameMessage: WordGameMessage = message as WordGameMessage;
      if (wordGameMessage.wordGameMessageType === WordGameMessageType.StartingGame) {
        if (wordGameMulti !== null) {
          console.warn("there is an error with the state of the application");
        }

        wordGameMulti = initWordGameMulti();

        wordGameMulti.handleAppMessage(user, message, root);

      } else {
        logger.writeLn(`(${formatPeerName(user.name)}) : ${formatWarn("received an application level message but there is no handling for this")}`);
        console.warn("there is an error with the state of the application");
        console.warn(message);
      }
    }
  }
};

const wordGameMessagingEN = new WordGameMessagingEN();

function isSelf(player: Player) {
  return player.user.peer.id === peer.id;
}

const wordGameMessageHandler: WordGameMessageHandler = {
  onStartingGame: function (settings: IWordGameMultiSettings, players: Player[], admin: Player): void {
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatStartingGame(players)}`);
    logger.writeLn(`${wordGameMessagingEN.formatSettings(settings)}`);
  },
  onPlayerWon: function (winner: Player, from: Player, admin: Player): void {
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatPlayerHasWon(winner.user.name, winner.score, isSelf(winner))}`);
  },
  onAdminActionAttempted: function (player: Player, messageType: WordGameMessageType, admin: Player): void {
    logger.writeLn(`(${formatPeerName('administration')}) : ${wordGameMessagingEN.formatAdminActionAttempted(player.user.name, messageType)}`);
  },
  onSequenceToGuess: function (player: Player, sequence: string, timeToGuess: number, admin: Player): void {
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatPlayerMustGuessLetters(player.user.name, sequence, timeToGuess, isSelf(player))}`);
  },
  onGuessAttempt(playerGuessing: Player, word: string, sequence: string, admin: Player) {
    logger.writeLn(`(admin:${formatPeerName(playerGuessing.user.name)}) : ${word}`);
  },
  onIncorrectGuess: function (playerGuessing: Player, word: string, sequence: string, reason: GuessResult, admin: Player): void {
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatIncorrectGuess(playerGuessing.user.name, word, isSelf(playerGuessing))}`);
  },
  onCorrectGuess: function (playerGuessing: Player, word: string, sequence: string, scoreAdded: number, reason: GuessResult, admin: Player): void {
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatCorrectGuess(playerGuessing.user.name, scoreAdded, isSelf(playerGuessing))}`);
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatCurrentScore(playerGuessing.user.name, playerGuessing.score, isSelf(playerGuessing))}`);
  },
  onGuessTimeout: function (player: Player, admin: Player): void {
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatTimeToGuessTimedOut(player.user.name, isSelf(player))}`);
  },
  onWordExample: function (example: string, sequence: string, admin: Player): void {
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatWordExample(example, sequence)}`);
  },
  onSettingsUpdated: function (newSettings: IWordGameMultiSettings, formerSettings: IWordGameMultiSettings, player: Player, admin: Player): void {
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatSettingsWereUpdated(player.user.name)}`);
    logger.writeLn(`${wordGameMessagingEN.formatSettings(newSettings)}`);
  }
};

const animalNames = ['Dog', 'Bear', 'Duck', 'Cat', 'Turtle', 'Horse', 'Crocodile', 'Chicken', 'Dolphin'];

// FIXME : duplicated, not sure it is useful in P2PRoom
function getRandomName(): string {
  // TODO : generate a ano name if names is empty
  return animalNames[Math.floor(Math.random() * animalNames.length)];
}

var localUser: LocalUser | null;

function isSelfAdmin() {
  return localUser.peer.id === roomManager.currentRoom.roomOwner.id;
}

function joinRoomCallback(room: IRoom) {
  if (p2pRoom !== null) {
    console.warn("has just joined a room but p2pRoom is not null");
  }
  if (isNullOrUndefined(roomManager.currentRoom)) {
    console.warn("currentRoom should not be null at this point");
  }
  if (roomManager.currentRoom !== room) {
    console.warn("currentRoom should not be different than the room of the callback");
  }
  if (isNullOrUndefined(wordGame)) {
    console.warn("wordGame should not be null at this point");
  }

  localUser = {
    peer: new Peer(peer),
    name: getRandomName(),
  };
  p2pRoom = new P2PRoom(localUser, roomMessageHandler, appMessageHandler, animalNames);

  room.clients.forEach((value: IClient, key: string) => {
    if (value.id === peer.id) return;
    console.log('connections');
    console.log(peer.connections);
    const connection = peer.connect(value.id);
    // TODO : unit test to add to check we are not adding the connection here (at this level, it could failed at this point)
    // this.connections.set(connection.peer, new Connection(connection))
    // TODO : display the connection on 'connecting' et indiquer connected / failed|error
    p2pRoom.bindConnection(connection);
  });

  if (localUser.peer.id === room.roomOwner.id) {
    logger.writeLn('You are admin of the room');
  } else {
    logger.writeLn('You are not admin of the room');
  }
  console.log(peer.connections);
}

// TODO : try catch all of this
async function main() {

  const rooms = peerJSClient.getRooms();
  console.log(rooms);

  const wordDatabaseRootURL: string = 'https://dev.onesime-deleham.ovh/';
  const wordDatabaseFilename: string = 'sample.db';
  const frenchWordDatabase = new FrenchWordDatabase(wordDatabaseRootURL, wordDatabaseFilename, logger);
  // TODO : add a log here for Dexie
  await frenchWordDatabase.open();
  await frenchWordDatabase.initSQL();

  wordGame = new WordGame(frenchWordDatabase, wordGameSettings);

  const wordGameCommand = new WordGameCommand(wordGame, configureCommand, logger);
  wordGameCommand.setup();
  configureCommand(wordGameCommand);
  program.addCommand(wordGameCommand);

  const databaseCommand = new DatabaseCommand(frenchWordDatabase, configureCommand, logger);
  databaseCommand.setup();
  configureCommand(databaseCommand);
  program.addCommand(databaseCommand);

  const roomCommand = new RoomCommand(roomManager, peer, configureCommand, logger, joinRoomCallback);
  roomCommand.setup();
  configureCommand(roomCommand);
  program.addCommand(roomCommand);

  configureCommand(program);

  function handleOfflineInput(text: string) {
    const result = wordGame.verifyGuess(text);

    writeNewLine();

    switch (result) {
      case GuessResult.SUCCESSFUL_GUESS:
        writeLn('Success !')
        break;
      case GuessResult.WORD_DO_NOT_EXIST:
        writeLn('This word do not exist in the database.');
        break;
      case GuessResult.WORD_DO_NOT_MATCH_SEQUENCE:
        writeLn(`This word do not match the current sequence ('${wordGame.currentSequence}').`);
        break;
      default:
        writeErr('Internal error');
        console.error(`GuessResult '${result} is unknown`);
    }
    if (wordGame.remainingAttempts() === 0) {
      writeLn('You have failed to find a word matching this sequence of letters.');
      writeLn(`You could have tried : '${wordGame.getExampleForSequence()}'`);
      wordGame.reset();
      prompt();
    } else {
      prompt();
    }
  }

  async function handleInRoomInput(text: string) {
    // TODO : checkout for '//' as a way to send a message
    if (text.startsWith('/')) {
      console.log('starts with /, using cmdy');
      const argsForCmdy = [...text.trim().split(' ')]
      try {
        const parseResult = parseCmd({
          cmd: root,
          globalFlags: [
              
          ],
          args: argsForCmdy
        });
        
        if (parseResult.err) {
          console.warn(parseResult.err);
          // TODO : this is prompting, it would be nice to control when the prompt is made
          // It has become hard to know
          logger.error(parseResult.err.message);// Info : we assume it is a normal exception
        } else {
          if (parseResult.msg) {
            console.log("has msg");
            logger.writeLn(parseResult.msg);
          }
          console.log("running command");

          // FIXME : this is not working
          // We return before the command is actually executed
          // Which cause a UI bug when using /leave
          await parseResult.exe();

          console.log("command executed");

          prompt();
        }
        
      } catch (err) {// FIXME : do not seem to be catching exceptions of promise of parseResult.exe
        console.log("an unexpected error occurred");
        console.error(err);

        prompt();
      }
    } else {
      // TODO : handle error, not exist etc
      // wordGameMulti.sendMessage(text);
      if (wordGameMulti !== undefined) {
        console.log('game prompt');
        wordGameMulti.sendMessage(text);
      } 
      else if (p2pRoom !== null) {
        console.log("sending message");
        p2pRoom.sendMessage(text);
      } 
      else {
        logger.writeLn(formatWarn('Attempting to send a message while not connected'));
      }

      prompt();
    }
  }

  // TODO : implement Ctrl C & Ctrl V

  // TODO : arrow navigation in the commands

  // TODO : do not attempt to run the command if it is not the main one
  // TODO : add a help command
  // TODO : use a context system : if press wg, stay in the wg command
  async function runCommand(text: string) {
    console.log("runCommand");

    // process (node), script (script.js), args
    // require to pass the name of the command if the name is passed to the program
    // program.name('name-of-the-app')
    const args = ['nothing', /*'nothing',*/ ...text.trim().split(' ')]

    try {
      // TODO : replace by a state machine or an input capture system
      // TODO : move the check somewhere else, it is also used in WordGameCommand
      if (isInRoom()) {
        await handleInRoomInput(text);
      } else if (wordGame.isGuessing) {
        handleOfflineInput(text);
      } else {
        await program.parseAsync(args);
      }
    } catch (err) {
      console.log("an error occured:");
      console.warn(err);
    }
  }

  // TODO : test this
  // Modified version of this one https://github.com/xtermjs/xtermjs.org/blob/281b8e0f9ac58c5e78ff5b192563366c40787c4f/js/demo.js
  // MIT license
  promptTerm.onData((e) => {
    // console.log("ondata " + e);
    // TODO : use a special character enum provider
    switch (e) {
      case '\u001B':
        if (wordGame.isGuessing) {
          wordGame.reset();
          writeOut('You are no longer playing.');
        }
        break;
      case '\u0003': // Ctrl+C
        if (wordGame.isGuessing) {
          wordGame.reset();
          writeOut('You are no longer playing.');
        } else {
          promptTerm.writeNoHistory('^C');
          prompt();
        }
        break;
      case '\r': // Enter
        if (command.trim().length > 0) {
          // promptTerm.write(command);
          try {
            runCommand(command);
          }
          catch (error) {
            console.log(error);
          } finally {
            console.log('finally');
            //promptTerm.write(command);
            promptTerm.scrollToBottom();// use this for the normal flow
            command = '';
          }
        } else {
          prompt();
        }
        break;
      case '\u007F': // Backspace (DEL)
        // Do not delete the prompt

        // Info : those are not available in typescript
        //if (term.buf_core.buffer.x > 2) {
        //if (term.buffer.x > 2) {
        if (command.length > 0) {
          promptTerm.writeNoHistory('\b \b');
          if (command.length > 0) {
            command = command.substr(0, command.length - 1);
          }
        }
        break;
      default: // Print all other characters for demo
        if (e >= String.fromCharCode(0x20) && e <= String.fromCharCode(0x7E) || e >= '\u00a0') {
          command += e;
          promptTerm.writeNoHistory(e);
        }
    }
  });

  // if (targetElement != null) {
    // TODO : insert ASCII art here
    messageTerm.write('\x1B[1;3;31mWordGuessr\x1B[0m ');

    // FIXME : illegal access is logged from here
    // In Firefox, A mutation operation was attempted on a database that did not allow mutations
    // Is also logged here, but should not be
    // There is also A mutation operation was attempted on a database that did not allow mutations.
    // (on the prompt)
    // TODO : verify if errors still occur
    const helpText = program.helpInformation();
    writeLn(helpText);
    // prompt();
  // }
}

main();
