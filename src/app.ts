import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

import { Command, OutputConfiguration } from 'commander';

import { DatabaseCommand, WordGameCommand, Logger, FrenchWordDatabase } from 'word-guessing-game-common';
import { GuessResult, WordGame, WordGameOptions } from 'word-guessing-lib';

import { Config, buildConfig } from './config/Config';
import { PeerJSServerClient } from './domain/adapters/secondary/api/PeerJSServerClient';
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
import { StartGameCmd, StartGameEvents } from './commands/cmdy/StartGameCmd';
import { LeaveRoomCmd, LeaveRoomEvents } from './commands/cmdy/LeaveRoomCmd';
import { ConnectionCmd } from './commands/cmdy/ConnectionCmd';
import { ModifySettingsCmd } from './commands/cmdy/WordGameSettingsCmd';
import { StateManager } from './domain/state/StateManager';
import { VirtualInput } from './domain/state/VirtualInput';
import { OfflineState } from './domain/state/OfflineState';
import { InRoomState } from './domain/state/InRoomState';
import { CreatedRoomCallback, JoinedRoomCallback } from './commands/RoomCommand';
import { InOnlineGameState } from './domain/state/InOnlineGameState';
import { LeaveGameEvents } from './commands/cmdy/LeaveGameCmd';
import { AppMessageHandlerImpl } from './domain/AppMessageHandlerImpl';

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


// const program = new Command();

// program
//   // Info : if you set it, you will need to pass it as a parameter
//   // If you do not set it, it will appear in the help command anyway
//   // There is something weird actually
//   // FIXME : 'run etc' is also working
//   .name('/run')
//   .description('CLI to execute commands')
//   .version('0.0.1');

function writeNewLine() {
  messageTerm.write('\r\n');
}

// TODO : use an option that make sure it is declared before it is used
var command = '';

// TODO : checkout why I've putted a application-message event on PeerJS fork

const config = buildConfig();
// const peer = await createPeer(config);

console.log(process.env.PEER_SERVER_HOSTNAME);
console.log(config);
// console.log(peer);

const peerJSClient = new PeerJSServerClient({
  host: config.peerServerHostname,
  port: config.peerServerPort,
  secure: config.secure,
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

function wordGameInitializer(): WordGameMulti {
  return new WordGameMulti(
    roomManager.currentRoom,
    wordGame,
    p2pRoom,
    new WordGameMessagingEN(),
    wordGameSettings,
    new WordMessageHandlerImpl(p2pRoom.localUser, p2pRoom)
  );
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

// var wordGameMulti: WordGameMulti | null;
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
  // technical
  onAttemptingConnections: function (room: IRoom): void {
    logger.writeLn(`${getFormattedRoomPrefix()}Attempting to connect to user of the room`);
  },
  onConnectionEstablished: function (connection: PeerJS.DataConnection, user: User): void {
    logger.writeLn(`${getFormattedRoomPrefix()}A connection was established with ${user.name}:${user.peer.id}`);
  },
  onConnectionClosed: function (connection: PeerJS.DataConnection, user: User): void {
    logger.writeLn(`${getFormattedRoomPrefix()}A connection was closed (user: ${user.name}:${user.peer.id})`);
  },
  onConnectionError: function (connection: PeerJS.DataConnection, user: User, error: any): void {
    logger.writeLn(`${getFormattedRoomPrefix()}${formatError(error.message)}`);
  },
  onMissingConnections: function (clients: IClient[]): void {
    logger.writeLn(`${getFormattedRoomPrefix()}Not able to connect to all users, missing users:`);
    clients.forEach((client: IClient) => {
      logger.writeLn(`Client: ` + client.id);
    });
  },
  onAllConnected: function (): void {
    logger.writeLn(`${getFormattedRoomPrefix()}Successfully connected to all users of the room.`);
  },
  // messaging
  onTextMessage: function (connection: PeerJS.DataConnection, user: User, text: string, textMessage: TextMessage, root: Message): void {
    logger.writeLn(`(${formatRoomName(roomManager.currentRoom.roomName)}):${user.name}:${user.peer.id}: ${text}`);
  },
  onRenameUserMessage: function (connection: PeerJS.DataConnection, user: User, newName: string, formerName: string, renameUserMessage: RenameUserMessage, root: Message): void {
    logger.writeLn(`peer ${formatPeerName(connection.peer)} has renamed to ${newName} ` + (formerName.length === 0 ? '' : `(formerlly named ${formerName})`));
  },
};

const wordGameMessagingEN = new WordGameMessagingEN();

// FIXME : move it to a adapter directory, move the interface to a port directory
class WordMessageHandlerImpl implements WordGameMessageHandler {

  user: User;
  p2pRoom: P2PRoom;

  constructor(user: User, p2pRoom: P2PRoom) {
    this.user = user;
    this.p2pRoom = p2pRoom;
  }

  isSelf(player: Player) {
    return player.user.peer.id === this.user.peer.id;
  }

  onStartingGame (settings: IWordGameMultiSettings, players: Player[], admin: Player): void {
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatStartingGame(players)}`);
    logger.writeLn(`${wordGameMessagingEN.formatSettings(settings)}`);
  }
  onPlayerWon (winner: Player, from: Player, admin: Player): void {
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatPlayerHasWon(winner.user.name, winner.score, this.isSelf(winner))}`);
  }
  onAdminActionAttempted (player: Player, messageType: WordGameMessageType, admin: Player): void {
    logger.writeLn(`(${formatPeerName('administration')}) : ${wordGameMessagingEN.formatAdminActionAttempted(player.user.name, messageType)}`);
  }
  onSequenceToGuess (player: Player, sequence: string, timeToGuess: number, occurences: number, admin: Player): void {
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatPlayerMustGuessLetters(player.user.name, sequence, timeToGuess, occurences, this.isSelf(player))}`);
  }
  onGuessAttempt(playerGuessing: Player, word: string, sequence: string, admin: Player) {
    logger.writeLn(`(admin:${formatPeerName(playerGuessing.user.name)}) : ${word}`);
  }
  onIncorrectGuess (playerGuessing: Player, word: string, sequence: string, reason: GuessResult, admin: Player): void {
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatIncorrectGuess(playerGuessing.user.name, word, this.isSelf(playerGuessing))}`);
  }
  onCorrectGuess (playerGuessing: Player, word: string, sequence: string, scoreAdded: number, reason: GuessResult, admin: Player): void {
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatCorrectGuess(playerGuessing.user.name, scoreAdded, this.isSelf(playerGuessing))}`);
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatCurrentScore(playerGuessing.user.name, playerGuessing.score, this.isSelf(playerGuessing))}`);
  }
  onGuessTimeout (player: Player, admin: Player): void {
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatTimeToGuessTimedOut(player.user.name, this.isSelf(player))}`);
  }
  onWordExample (example: string, sequence: string, admin: Player): void {
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatWordExample(example, sequence)}`);
  }
  onSettingsUpdated (newSettings: IWordGameMultiSettings, formerSettings: IWordGameMultiSettings, player: Player, admin: Player): void {
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatSettingsWereUpdated(player.user.name)}`);
    logger.writeLn(`${wordGameMessagingEN.formatSettings(newSettings)}`);
  }
  onPlayerRemoved(player: Player, from: Player, admin: Player) {
    logger.writeLn(`(admin:${formatPeerName(admin.user.name)}) : ${wordGameMessagingEN.formatPlayerWasRemoved(player.user.name, this.isSelf(player))}`);
  }
  
}

const animalNames = ['Dog', 'Bear', 'Duck', 'Cat', 'Turtle', 'Horse', 'Crocodile', 'Chicken', 'Dolphin'];

// FIXME : duplicated, not sure it is useful in P2PRoom
function getRandomName(): string {
  // TODO : generate a ano name if names is empty
  return animalNames[Math.floor(Math.random() * animalNames.length)];
}

var localUser: LocalUser | null;

// CreatedRoomCallback
function createdRoomCallback(room: IRoom, peer: PeerJS) {
  throw new Error('not implemented');
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

  const vitualInput = new VirtualInput(promptTerm);
  const stateManager = new StateManager(promptTerm, messageTerm, vitualInput, logger, configuration);

  async function peerProvider() {
    const peer = await createPeer(config);
    console.log("peerid: ");
    console.log(peer);
    console.log(peer.id);
    return peer;
  }

  stateManager.stateRegister.register('offline', new OfflineState(
    vitualInput,
    logger,
    frenchWordDatabase,
    wordGame,
    roomManager,
    (async () => await peerProvider()),
    joinedRoomCallback, createdRoomCallback, configuration
    )
  );
  stateManager.stateRegister.changeTo('offline');

  // JoinedRoomCallback
  function joinedRoomCallback(room: IRoom, peer: PeerJS) {
    console.log("joinedRoomCallback");

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

    function onStartedGame(wordGameMulti: WordGameMulti): void {
      console.log("onStartedGame : setting onlinegame state");

      // We are in game now
      const leaveGameEvents: LeaveGameEvents = {
        onLeaveGame() {
          stateManager.stateRegister.currentState = getInRoomState();
        }
      }
      let inOnlineGameState = new InOnlineGameState(logger, vitualInput, roomManager, p2pRoom, wordGameMulti, leaveGameEvents);
      stateManager.stateRegister.currentState = inOnlineGameState;
    }

    logger.writeLn(`You joined the room as ${localUser.name} (${localUser.peer.id})`);

    const appMessageHandler = new AppMessageHandlerImpl(logger, roomManager, wordGameInitializer, onStartedGame);

    p2pRoom = new P2PRoom(localUser, room, roomMessageHandler, appMessageHandler, animalNames);
  
    if (localUser.peer.id === room.roomOwner.id) {
      logger.writeLn('You are admin of the room');
    } else {
      logger.writeLn('You are not admin of the room');
    }
    console.log(peer.connections);

    let leaveRoomEvents: LeaveRoomEvents = {
      onLeaveRoom() {
        stateManager.stateRegister.changeTo('offline');
      }
    };

    function getInRoomState() {
      return new InRoomState(logger, vitualInput, roomManager, p2pRoom, peer, startGameEvents, wordGameInitializer, leaveRoomEvents);
    }

    let startGameEvents: StartGameEvents = {
      onStartedGame: onStartedGame
    }
  
    stateManager.stateRegister.currentState = getInRoomState();
  }

  // TODO : test this
  promptTerm.onData((char) => {

    vitualInput.feed(char);

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

  // TODO : better help
  //const helpText = program.helpInformation();
  // writeLn(helpText);

  // prompt();
  // }
}

main();
