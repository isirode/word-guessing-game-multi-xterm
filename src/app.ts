import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

import { OutputConfiguration } from 'commander';

import { Logger, SupportedLangDatabases, WordDatabaseFactory } from 'word-guessing-game-common';
import { GuessResult, SupportedLanguages, WordGame } from 'word-guessing-lib';

import { buildConfig } from './config/Config';
import { createPeer } from './peer';
import { PromptUpTerminal } from './term/PromptUpTerminal';
import { WordGameMulti } from './domain/WordGameMulti';
import { LocalUser, Message, P2PRoom, RenameUserMessage, TextMessage, User, IClient, Peer as DomainPeer, PeerJSServerClient, RoomService } from 'peerjs-room';
import { ITimer } from './domain/models/Timer';
import { IWordGameMultiSettings } from './domain/settings/IWordGameMultiSettings';
import { WordGameMessagingEN } from './domain/adapters/secondary/locale/WordGameMessagingEN';
import { WordGameMessageType } from './domain/models/Message';
// import Peer = require('peerjs');
// WARN : import this way because typescript cannot handle similar types but named differently
import * as Peer from 'peerjs';
import { Player } from './domain/models/Player';
import { StateManager } from './domain/state/StateManager';
import { VirtualInput } from './domain/state/VirtualInput';
import { OfflineState } from './domain/state/OfflineState';
import { InRoomState } from './domain/state/InRoomState';
import { InOnlineGameState } from './domain/state/InOnlineGameState';
import { AppMessageHandlerImpl } from './domain/AppMessageHandlerImpl';
import { SettingsStoreSingleton } from './domain/settings/SettingsStoreSingleton';
import { RoomEventData } from './commands/domain/RoomCommand';
import { ConsoleAppender, IAppender, IConfiguration, ILayout, ILogEvent, Level, LogManager, PupaLayout } from 'log4j2-typescript';
import { Server } from 'peerjs-request-response';
import { WordGameMultiInitializer } from './commands/domain/GameCommand';
import { RoomMessageEventsLogger } from './domain/logging/RoomMessageEventsLogger';
import { WordGameEventsLogger } from './domain/logging/WordGameEventsLogger';

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

const roomService = new RoomService(peerJSClient);

// TODO : move it an util or find an equivalent lib
function isNullOrUndefined(object: any) {
  return object === null || object === undefined;
}

function isInRoom() {
  return !isNullOrUndefined(roomService.currentRoom);
}

function getRoomPrefix(): string {
  let value = '';
  if (isInRoom()) {
    value += '(' + roomService.currentRoom.roomName;
    if (!isNullOrUndefined(localUser)) {
      value += ':' + localUser.name + ':' + localUser.peer.id;
      // TODO : log conditionally ID
    }
    value += ') ';
  }
  return value;
}

// function getFormattedRoomPrefix(): string {
//   let value = '';
//   if (isInRoom()) {
//     value += '(' + formatRoomName(roomService.currentRoom.roomName);
//     if (localUser !== null) {
//       value += ':' + formatPeerName(localUser.name) + ':' + formatPeerId(localUser.peer.id);
//       // TODO : log conditionally ID
//     }
//     value += ') : ';
//   }
//   return value;
// }

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

class TermAppender implements IAppender {

  name: string;
  layout: ILayout;

  constructor(name: string, layout: ILayout) {
    this.name = name;
    this.layout = layout;
  }

  handle(logEvent: ILogEvent): void {
    logger.writeLn(this.layout.format(logEvent));
  }

}

const logConfiguration: IConfiguration = {
  appenders: [
    new ConsoleAppender("console", new PupaLayout("{loggerName} {level} {time} {message}")),
    new TermAppender("term", new PupaLayout("{message}"))
  ],
  loggers: [
    {
      name: "technical",
      level: Level.INFO,
      refs: [
        {
          ref: "console"
        }
      ]
    },
    {
      name: "term",
      level: Level.INFO,
      refs: [
        {
          ref: "term"
        }
      ]
    }
  ]
}

const logManager: LogManager = new LogManager(logConfiguration);

// FiXME : should not be global
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

// function formatRoomName(room: string) {
//   return green2Font + room + resetSequence;
// }

// TODO : allow to select it
function formatPeerName(peer: string) {
  return blueFont + peer + resetSequence;
}

// function formatPeerId(peerId: string) {
//   return yellowFont + peerId + resetSequence;
// }

function formatWarn(text: string) {
  return orangeFont + text + resetSequence;
}

function formatError(text: string) {
  return redFont + text + resetSequence;
}

const wordGameMessagingEN = new WordGameMessagingEN();

const animalNames = ['Dog', 'Bear', 'Duck', 'Cat', 'Turtle', 'Horse', 'Crocodile', 'Chicken', 'Dolphin'];

// FIXME : duplicated, not sure it is useful in P2PRoom
function getRandomName(): string {
  // TODO : generate a ano name if names is empty
  return animalNames[Math.floor(Math.random() * animalNames.length)];
}

var localUser: LocalUser | null;

// TODO : try catch all of this
async function main() {

  messageTerm.write('\x1B[1;3;31mWordGuessr\x1B[0m\r\n');

  // TODO : mutualize this message with the multiplayer game
  writeLn(`We are using two different databases for the dictionaries:
  - For the french language, we are using an extraction of Grammalecte's dictionary, which is released in MPL 2.0
  - For the english language, we are using an extraction of Wiktionary's dictionary, which is released under a dual license:
      - GNU Free Documentation License (GFDL)
      - Creative Commons Attribution-ShareAlike License
  `);

  const supportedLangDatabases: SupportedLangDatabases = {
    english: {
      language: "eng",
      filename: config.englishWordDatabase.filename,
    },
    french: {
      language: "fra",
      filename: config.frenchWordDatabase.filename,
    }
  };

  const databaseFactory = new WordDatabaseFactory(logger, config.wordDatabaseRootUrl, supportedLangDatabases);

  const englishDatabase = await databaseFactory.getEnglishWordDatabase();
  const frenchDatabase = await databaseFactory.getFrenchWordDatabase();

  const defaultWordGameSettings = {
    minOccurences: 250,
    maxOccurences: 1000,
    guessAsSession: true,
    maxAttempts: 5,
    language: "eng",
    // multi
    winningScore: 10,
    timePerGuess: 30,
  } as IWordGameMultiSettings;

  const settingsStore = SettingsStoreSingleton.instance();

  let settings = await settingsStore.find<IWordGameMultiSettings>("word-guessing", "settings");
  if (settings === undefined) {
    settingsStore.save("word-guessing", "settings", defaultWordGameSettings);
    settings = settingsStore.watch("word-guessing", "settings", defaultWordGameSettings);
  }
  // TODO : checkout that every properties are present
  // And add a fallback system
  console.log("Settings:");
  console.log(settings);

  const wordGameInitializer: WordGameMultiInitializer = {
    instantiate(lang: string): WordGameMulti {
      // FIXME : probably should be done in WordGameMulti
      if (lang !== undefined) {
        let finalLang: SupportedLanguages = lang as SupportedLanguages;
        wordGame.overrideLanguage = finalLang;
      }
      // FIXME : the event handling should be done immediatly after
      return new WordGameMulti(
        roomService.currentRoom,
        p2pRoom,
        wordGame,
        settings
      );
    }
  };

  const rooms = peerJSClient.getRooms();
  console.log(rooms);

  const wordGame = new WordGame(frenchDatabase, englishDatabase, settings);

  const vitualInput = new VirtualInput(promptTerm);
  const stateManager = new StateManager(promptTerm, messageTerm, vitualInput, logger, configuration);

  async function peerProvider() {
    const peer = await createPeer(config);
    console.log("peerid: ");
    console.log(peer);
    console.log(peer.id);
    return peer;
  }

  const offlineState = new OfflineState(
    vitualInput,
    logger,
    frenchDatabase,
    englishDatabase,
    wordGame,
    roomService,
    (async () => await peerProvider()),
    configuration
  );
  stateManager.stateRegister.register('offline', offlineState);
  stateManager.stateRegister.changeTo('offline');

  function onRoomCreatedOrJoined(roomEventData: RoomEventData) {
    console.log("createdRoom");

    const {room, peer} = roomEventData;

    if (p2pRoom !== null) {
      console.warn("has just joined a room but p2pRoom is not null");
    }
    if (isNullOrUndefined(roomService.currentRoom)) {
      console.warn("currentRoom should not be null at this point");
    }
    if (roomService.currentRoom !== room) {
      console.warn("currentRoom should not be different than the room of the callback");
    }
    if (isNullOrUndefined(wordGame)) {
      console.warn("wordGame should not be null at this point");
    }
  
    localUser = {
      peer: new DomainPeer(peer),
      name: getRandomName(),
    };

    logger.writeLn(`You joined the room as ${localUser.name} (${localUser.peer.id})`);

    p2pRoom = new P2PRoom(localUser, room, animalNames);
    const roomMessageEventsLogger = new RoomMessageEventsLogger(logger, room, localUser);
    // technical
    p2pRoom.events.on('connectionEstablished', ({connection, user}) => {
      roomMessageEventsLogger.onConnectionEstablished(connection, user);
    });
    p2pRoom.events.on('connectionClosed', ({connection, user}) => {
      roomMessageEventsLogger.onConnectionClosed(connection, user);
    });
    p2pRoom.events.on('connectionError', ({connection, user, error}) => {
      roomMessageEventsLogger.onConnectionError(connection, user, error);
    });
    p2pRoom.events.on('missingConnections', ({missingConnections}) => {
      roomMessageEventsLogger.onMissingConnections(missingConnections);
    });
    p2pRoom.events.on('allConnected', ({clients}) => {
      roomMessageEventsLogger.onAllConnected();
    });
    // messaging
    p2pRoom.events.on('textMessage', ({connection, user, text, textMessage, root}) => {
      roomMessageEventsLogger.onTextMessage(connection, user, text, textMessage, root);
    });
    p2pRoom.events.on('renameUserMessage', ({connection, user, newName, formerName, renameUserMessage, root}) => {
      roomMessageEventsLogger.onRenameUserMessage(connection, user, newName, formerName, renameUserMessage, root);
    });
    // app
    const appMessageHandler = new AppMessageHandlerImpl(logger, roomService, wordGameInitializer);
    appMessageHandler.events.on('onInitializedGame', ({wordGameMulti}) => {
      console.log('onInitializedGame');
      // FIXME : not the most accurate but this will do, is there anything better ?
      onGameCreated(wordGameMulti);
    });
    p2pRoom.events.on('appMessage', ({user, appMessage, root}) => {
      console.log('on appMessage', user, appMessage, root);
      // TODO : create an enum for the states
      if (stateManager.stateRegister.currentStateName === 'in-room') {
        appMessageHandler.onAppMessage(user, appMessage, root);
      } else if (stateManager.stateRegister.currentStateName !== 'in-online-game') {
        console.warn(`state should not be '${stateManager.stateRegister.currentStateName}' at this stage`);
      }
    });

    function onGameCreated(wordGameMulti: WordGameMulti, initializeGame?: boolean): void {
      console.log("onStartedGame : setting onlinegame state");

      const wordGameEventsLogger = new WordGameEventsLogger(logger, localUser, p2pRoom, wordGameMessagingEN);
      // FIXME : use the logging system for the logging
      wordGameMulti.events.on('onJoinGameRequested', ({initializer, responseTimeout, settings, players, admin}) => {
        wordGameEventsLogger.onJoinGameRequested(initializer, responseTimeout, settings, players, admin);
      });
      wordGameMulti.events.on('onGameInitialized', ({initializer, responseTimeout, settings, players, admin}) => {
        wordGameEventsLogger.onInitGame(initializer, responseTimeout, settings, players, admin);
      });
      wordGameMulti.events.on('onStartingGame', ({initializer, settings, players, admin}) => {
        wordGameEventsLogger.onStartingGame(initializer, settings, players, admin);
      });
      wordGameMulti.events.on('onAdminActionAttempted', ({player, messageType, admin}) => {
        wordGameEventsLogger.onAdminActionAttempted(player, messageType, admin);
      });
      wordGameMulti.events.on('onSettingsUpdated', ({newSettings, formerSettings, player, admin}) => {
        wordGameEventsLogger.onSettingsUpdated(newSettings, formerSettings, player, admin);
      });
      wordGameMulti.events.on('onPlayerRemoved', ({player, from, admin}) => {
        wordGameEventsLogger.onPlayerRemoved(player, from, admin);
      });
      wordGameMulti.events.on('onSequenceToGuess', ({player, sequence, timeToGuess, occurrences, admin}) => {
        wordGameEventsLogger.onSequenceToGuess(player, sequence, timeToGuess, occurrences, admin);
      });
      wordGameMulti.events.on('onGuessAttempt', ({playerGuessing, word, sequence, admin}) => {
        wordGameEventsLogger.onGuessAttempt(playerGuessing, word, sequence, admin);
      });
      wordGameMulti.events.on('onGuessTimeout', ({player, admin}) => {
        wordGameEventsLogger.onGuessTimeout(player, admin);
      });
      wordGameMulti.events.on('onIncorrectGuess', ({playerGuessing, word, sequence, reason, admin}) => {
        wordGameEventsLogger.onIncorrectGuess(playerGuessing, word, sequence, reason, admin);
      });
      wordGameMulti.events.on('onWordExample', ({example, sequence, admin}) => {
        wordGameEventsLogger.onWordExample(example, sequence, admin);
      });
      wordGameMulti.events.on('onCorrectGuess', ({playerGuessing, word, sequence, scoreAdded, reason, admin}) => {
        wordGameEventsLogger.onCorrectGuess(playerGuessing, word, sequence, scoreAdded, reason, admin);
      });
      wordGameMulti.events.on('onPlayerWon', ({winner, from, admin}) => {
        wordGameEventsLogger.onPlayerWon(winner, from, admin);
      });

      // We are in game now
      let inOnlineGameState = new InOnlineGameState(logger, vitualInput, roomService, p2pRoom, wordGameMulti, wordGameEventsLogger);

      inOnlineGameState.gameEvents.on('leavedGame', () => {
        stateManager.stateRegister.setCurrentState('in-room', getInRoomState());
      });

      // TODO : state should have a name, so that we can query it
      stateManager.stateRegister.setCurrentState('in-online-game', inOnlineGameState);

      if (initializeGame) {
        wordGameMulti.initGame();
      }
    }
  
    if (localUser.peer.id === room.roomOwner.id) {
      logger.writeLn('You are admin of the room');
    } else {
      logger.writeLn('You are not admin of the room');
    }
    console.log(peer.connections);

    function getInRoomState(): InRoomState {
      const inRoomState = new InRoomState(logger, vitualInput, roomService, p2pRoom, wordGameInitializer);
      inRoomState.roomEvents.on('leavedRoom', () => {
        p2pRoom = undefined;
        localUser = undefined;
        stateManager.stateRegister.changeTo('offline');
      });
      inRoomState.gameEvents.on('createdGame', (wordGameMulti) => {
        onGameCreated(wordGameMulti, true); 
      });
      return inRoomState;
    }
  
    stateManager.stateRegister.setCurrentState('in-room',  getInRoomState());
  };

  offlineState.roomEvents.on('joinedRoom', onRoomCreatedOrJoined);
  offlineState.roomEvents.on('createdRoom', onRoomCreatedOrJoined);

  // TODO : test this
  promptTerm.onData((char) => {

    vitualInput.feed(char);

  });

  logger.prompt();

  // if (targetElement != null) {
  // TODO : insert ASCII art here
  // messageTerm.write('\x1B[1;3;31mWordGuessr\x1B[0m ');

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
