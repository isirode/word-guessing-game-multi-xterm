import { AppMessage, IRoom, MessageType, sanitizeUser } from 'peerjs-room';
import {
  WordGameMessageType, StartingGameMessage,
  LettersToGuessMessage, WordGuessMessage, IncorrectGuessMessage, CorrectGuessMessage, GuessTimeoutMessage,
  PlayerWonMessage, isRoomMessageTypeProtected, WordExampleMessage, UpdateSettingsMessage, WordGameMessage, RemovePlayerMessage, TransferGameAdminshipMessage, InitGameResponseMessage, InitGameResponseBody, InitGameMessage
} from './models/Message';
import { IWordGameMultiSettings } from './settings/IWordGameMultiSettings';
import { WordGame, GuessResult, SupportedLanguages } from 'word-guessing-lib';
// import { AnyMessage, AppMessageHandler, Message, P2PRoom, User } from './P2PRoom';
import { AnyMessage, Events as RoomEvents, Message, P2PRoom, User } from 'peerjs-room';
import { Player } from './models/Player';
import Emittery from 'emittery';
import { Client, IClientMapper, Request, Response } from 'peerjs-request-response';
import { v4 as uuidv4 } from 'uuid';

// TODO : game should expose an initialization mechanism, message handling

// TODO : find a way to expose a handler interface based on this
export interface Events {
  onJoinGameRequested: {initializer: User, responseTimeout: number, settings: IWordGameMultiSettings, players: Player[], admin: User};
  onGameInitialized: {initializer: User, responseTimeout: number, settings: IWordGameMultiSettings, players: Player[], admin: User};
  onStartingGame: {initializer: User, settings: IWordGameMultiSettings, players: Player[], admin: User};

  onPlayerWon: {winner: Player, from: Player, admin: Player};
  onAdminActionAttempted: {player: Player, messageType: WordGameMessageType, admin: Player};

  onSequenceToGuess: {player: Player, sequence: string, timeToGuess: number, occurrences: number, admin: Player};
  onGuessAttempt: {playerGuessing: Player, word: string, sequence: string, admin: Player};
  onIncorrectGuess: {playerGuessing: Player, word: string, sequence: string, reason: GuessResult, admin: Player};
  onCorrectGuess: {playerGuessing: Player, word: string, sequence: string, scoreAdded: number, reason: GuessResult, admin: Player};
  onGuessTimeout: {player: Player, admin: Player};

  onWordExample: {example: string, sequence: string, admin: Player};
  onSettingsUpdated: {newSettings: IWordGameMultiSettings, formerSettings: IWordGameMultiSettings, player: Player, admin: Player};

  onPlayerRemoved: {player: Player, from: Player, admin: Player | undefined};
}
export type EventsKeys = keyof Events;

// TODO : use an interface
// import TimerType from  '../components/Timer.vue'

// TODO : interval seem to be paused (Brave) when tab is not active / switch
// difficult to test

// TODO : remove player if disconnect ?

export type KeyOfSettings = keyof IWordGameMultiSettings;

export const appName: string = "word-guessing";

export class WordGameMulti {

  // #region "Members"

  // TODO : move the binding player / peer somewhere else
  localPlayer: Player;
  // FIXME : is a map better ?
  players: Player[] = [];

  // TODO : change gameStarted with something else ? like a state or gameHasStarted maybe
  // TODO : find a solution for the redefinition of this properties here and in the offline wordgame
  gameStarted: boolean = false;
  _currentSequence: string = '';

  // TODO : qqchse de plus comprehensif, like in a state (currentPlayerId)
  playerIdCurrentlyPlaying: string = '';// TODO : rename it
  room: IRoom;

  // FIXME : I do not remember why there is an additional timer
  // I think it has to do with displaying the timer
  // Or the multiplayer part
  //timer: ITimer

  wordGame: WordGame;

  // TODO : move to a settings model
  settings: IWordGameMultiSettings;

  // FIXME : move this ? use an event emitter ?
  // messages: Message[] = []

  // TODO : make it more obvious (its the id of the player, an index)
  currentId: number = 0;

  // TODO : use correct type, make is function more obvious
  currentTimer: NodeJS.Timeout | number | null = null;//ReturnType<typeof setTimeout> = -1;// FIXME : weirdly does not work anymore

  // FIXME : should probably be an interface
  p2pRoom: P2PRoom;

  events: Emittery<Events>;

  joinGameRequestId?: string;
  userInitializer?: User;

  // #endregion

  // #region "Computed properties"

  // FIXME : if we use getter, we need to synchronize it for each clients
  // Not sure we want to do this
  // get gameStarted(): boolean {
  //   // TODO : rename or a add a property isPlaying or equivalent in the offline WordGame
  //   return this.wordGame.isGuessing;
  // }

  get currentSequence(): string {
    if (this.isLocalUserAdmin) {
      return this.wordGame.currentSequence.stringSequence;
    }
    return this._currentSequence;
  }

  get canStartGame(): boolean {
    if (this.room === null || this.room === undefined) {
      return false;
    }
    if (this.localPlayer === null || this.localPlayer === undefined) {
      return false;
    }
    if (this.gameStarted === true) {
      return false;
    }
    // TODO : reimplement adminship in another way
    // Should indicate a reason
    // if (this.room.roomOwner.id === this.localPlayer.user.peer.id) {
    //   return true;
    // }
    return true;
  }

  get canUpdateSettings (): boolean {
    return this.isLocalUserAdmin && !this.gameStarted;
  }

  get isGuessing (): boolean {
    return this.localPlayer.user.peer?.id === this.playerIdCurrentlyPlaying;
  }

  get adminId (): string {
    return this._adminId !== "" ? this._adminId : this.room?.roomOwner.id;
  }

  get isLocalUserAdmin (): boolean {
    return this.adminId === this.localPlayer.user.peer.id;
  }

  get isPlaying(): boolean {
    return this.gameStarted;
  }

  get localUser(): User {
    return this.localPlayer.user;
  }

  // #endregion

  constructor (room: IRoom, p2pRoom: P2PRoom, wordGame: WordGame, settings: IWordGameMultiSettings) {
    this.room = room;
    this.p2pRoom = p2pRoom;
    this.wordGame = wordGame;
    //this.timer = timer
    this.settings = settings;

    // TODO : init player

    const self = this;
    p2pRoom.events.on('appMessage', ({user, appMessage, root}) => {
      self.handleAppMessage(user, appMessage, root);
    });

    this.localPlayer = {
      user: p2pRoom.localUser,
      score: 0,
    } as Player;

    this.events = new Emittery();

    // this.onMessagePushedCallback = onMessagePushedCallback;
  }

  // #region "Methods"

  static getWordGameMessage(anyMessage: AnyMessage): WordGameMessage {
    const appMessage = anyMessage as AppMessage;
    let message: WordGameMessage;
    switch (appMessage.app) {
      case appName:
        console.log(`casting because app is ${appName}`);
        message = appMessage.payload as WordGameMessage;
        console.log(message);
        break;
      default:
        throw new Error(`unknown app ${appMessage.app}`);
    }
    return message;
  }

  public async initGame() {

    console.log("init game");

    if (this.canStartGame === false) {
      console.log('cannot start game');
      // FIXME : should be handled this way ?
      this.events.emit('onAdminActionAttempted', {
        player: this.localPlayer, 
        messageType: WordGameMessageType.StartingGame, 
        admin: this.getAdminPlayer()
      });
      return;
    }

    // Info : we give adminship of the game to the user initializing it
    this._adminId = this.localUser.peer.id;

    const players = this.getUsersAsPlayers();
    // FIXME : mutualize this
    const playersIds = players.map(x => x.user.peer.id);

    // FIXME : make it a setting
    const gameInitTimeout = 15000;

    // FIXME : assign the initializer ?

    // FIXME : move it after ?
    // FIXME : should it be two different events ?
    this.events.emit('onGameInitialized', {
      initializer: this.localUser,
      responseTimeout: gameInitTimeout,
      settings: this.settings,
      players,
      admin: this.getAdminUser()
    });

    const self = this;
    const mapper: IClientMapper<undefined, InitGameResponseBody> = {
      unwrap: function (data: any): Response<InitGameResponseBody> {
        // FIXME : this is ugly
        const message: Message = data as Message;
        if (message.type === MessageType.App) {
          const appMessage = message.payload as AppMessage;
          if (appMessage.app === appName) {
            const wordGameMessage = appMessage.payload as WordGameMessage;
            if (wordGameMessage.wordGameMessageType === WordGameMessageType.InitGameResponse) {
              const initGameMessageResponse = wordGameMessage.payload as InitGameResponseMessage;
              return initGameMessageResponse.response as Response<InitGameResponseBody>;
            }
          }
        }
      },
      // TODO : could have a class wrapper, with the correct types
      wrap: function (request: Request) {
        // TODO : mutualize this
        const initGameMessage: InitGameMessage = {
          request: request,
          playersIds: playersIds,
          lang: self.settings.language
        }
        const wordGameMessage: WordGameMessage = {
          wordGameMessageType: WordGameMessageType.InitGame,
          payload: initGameMessage
        }
        const appMessage: AppMessage = {
          app: appName,
          payload: wordGameMessage
        };
        const message: Message = {
          type: MessageType.App,
          from: sanitizeUser(self.p2pRoom.localUser),
          payload: appMessage
        };
        return message;
      }
    }

    const definitivePlayers: Player[] = [];
    for (let player of players) {
      if (player.user.peer.id === this.localUser.peer.id) {
        definitivePlayers.push(player);
        continue;
      }

      // TODO : should the user have a connection link ? could be a computed property
      const connection = this.p2pRoom.getConnection(player.user);
      if (connection === undefined) {
        console.warn(`the connection for the user '${player.user.name}:${player.user.peer}' was undefined`);
        continue;
      }

      const client = new Client(connection._connection, mapper);

      const request: Request<undefined> = {
        id: uuidv4(),
        timeout: gameInitTimeout,
        content: undefined
      }
      
      let response: Response;
      try {
        response = await client.fetch(request);
      } catch (err) {
        console.warn('probably a timeout', err);
        continue;
      }

      if (response.wasCancelled) {
        continue;
      }

      const body = response.payload as InitGameResponseBody;

      if (body.willJoin) {
        definitivePlayers.push(player);
      }
    }

    this.players = definitivePlayers;

    this.startGame();
  }

  public startGame () {
    
    console.log('start game');

    // if (this.canStartGame === false) {
    //   console.log('cannot start game');
    //   // FIXME : should be handled this way ?
    //   this.wordGameMessageHandler.onAdminActionAttempted(this.localPlayer, WordGameMessageType.StartingGame, this.getAdmin());
    //   return;
    // }

    console.log('starting game');

    // this.initiatePlayers();

    this.events.emit('onStartingGame', {
      initializer: this.localUser,
      settings: this.settings,
      players: this.players,
      admin: this.getAdminUser()
    });

    console.log('players');
    console.log(this.players.length);

    const playersIds = this.players.map(x => x.user.peer.id);
    console.log("playersIds");
    console.log(playersIds);

    const startingGameMessage: StartingGameMessage = {
      playersIds: playersIds,
      lang: this.settings.language as SupportedLanguages,
    }

    this.broadcastWordGameMessage(WordGameMessageType.StartingGame, startingGameMessage);

    // FIXME : Could wait or something else ?

    const id = Math.floor(Math.random() * this.players.length);
    this.newGuess(id);

    // Info : we have to set it manually
    this.gameStarted = true;
    

    // this.timer.startTimer()
  }

  join() {
    if (this.isPlaying) {
      // TODO : log something for the user
      console.warn('already playing');
      return;
    }
    if (!this.userInitializer) {
      console.warn('game was not initialized');
      return;
    }
    // TODO : mutualize this
    const responsebody: InitGameResponseBody = {
      willJoin: true,
    }
    const response: Response = {
      id: this.joinGameRequestId,
      payload: responsebody
    }
    const initGameMessageResponse: InitGameResponseMessage = {
      response: response
    }
    const wordGameMessage: WordGameMessage = {
      wordGameMessageType: WordGameMessageType.InitGameResponse,
      payload: initGameMessageResponse
    }
    const appMessage: AppMessage = {
      app: appName,
      payload: wordGameMessage
    };
    // FIXME : should handle the possibiity of broadcasting this
    // But it should not have any effect
    this.p2pRoom.sendApplicationMessage(this.userInitializer, appMessage);
  }

  // TODO : use room or refresh room
  // When a player refresh the web page, he leaves, he should be removed, but he is not put back in

  public verifyGuess (wordGuessMessage: WordGuessMessage) {
    console.log('verifying ' + wordGuessMessage.word);

    if (wordGuessMessage.sequence !== this.wordGame.currentSequence.stringSequence) {
      console.warn(`Local sequence (${this.currentSequence}) and message sequence (${wordGuessMessage.sequence}) are different`);
    }
    if (wordGuessMessage.language !== this.wordGame.currentSequence.language) {
      console.warn(`remote player is guessing for the language ${wordGuessMessage.language} but sequence's language is ${this.wordGame.currentSequence.language}, configured language is ${this.settings.language}`);
    }

    const result = this.wordGame.verifyGuess(wordGuessMessage.word);

    const player = this.getPlayerByPeerId(wordGuessMessage.playerId);
    if (player === undefined) {
      console.warn('player is undefined');
    }

    // Info : variable are not scoped in the switch branch
    // named are declared in the function scope
    // unless ifs, for which, the variable is scoped at the statement
    // wether it is a let or const
    switch (result) {
      case GuessResult.SUCCESSFUL_GUESS:
        console.log('Success !');
        // TODO : different way of computing score
        const score = wordGuessMessage.word.length;

        // const player = this.addScoreToPlayer(this.playerIdCurrentlyPlaying, score);

        player.score += score;

        // const sanitizedPlayer = sanitizePlayer(player);

        if (player === undefined) {
          console.warn('player ' + this.playerIdCurrentlyPlaying + ' is undefined, cannot add score to him')
        }
        const correctGuessMessage: CorrectGuessMessage = {
          points: score,
          playerId: player.user.peer.id,
          reason: result,
          word: wordGuessMessage.word,
          sequence: wordGuessMessage.sequence,
        }

        this.broadcastWordGameMessage(WordGameMessageType.CorrectGuess, correctGuessMessage);

        this.events.emit('onCorrectGuess', {
          playerGuessing: player,
          word: wordGuessMessage.word,
          sequence: wordGuessMessage.sequence,
          scoreAdded: score,
          reason: result,
          admin: this.getAdminPlayer()
        });
  
        if (player !== undefined && player.score >= this.settings.winningScore) {
  
          this.clearTimer();
          // this.timer.clearInterval()
  
          console.log('player ' + player.user.peer.id + ' has won');

          const playerWonMessage: PlayerWonMessage = {
            playerId: player.user.peer.id,
            score: player.score
          }
          this.broadcastWordGameMessage(WordGameMessageType.PlayerWon, playerWonMessage);

          this.events.emit('onPlayerWon', {
            winner: player,
            from: this.localPlayer,
            admin: this.getAdminPlayer()
          });

          // TODO : add an option to restart a game if necessary
          this.gameStarted = false;

          this.wordGame.reset();

          // TODO : timer to restart the game
          //this.gameStarted = false
        } else {
          this.newGuess()
        }
        break;
      case GuessResult.WORD_DO_NOT_EXIST:
        console.log('This word do not exist in the database.');
        const incorrectGuessMessage1: IncorrectGuessMessage = {
          word: wordGuessMessage.word,
          sequence: this.wordGame.currentSequence.stringSequence,
          reason: GuessResult.WORD_DO_NOT_EXIST,
          playerId: wordGuessMessage.playerId,
        }

        this.broadcastWordGameMessage(WordGameMessageType.IncorrectGuess, incorrectGuessMessage1);

        this.events.emit('onIncorrectGuess', {
          playerGuessing: player,
          word: wordGuessMessage.word,
          sequence: wordGuessMessage.sequence,
          reason: result,
          admin: this.getAdminPlayer()
        });

        break;
      case GuessResult.WORD_DO_NOT_MATCH_SEQUENCE:
        console.log(`This word do not match the current sequence ('${this.wordGame.currentSequence}').`);
        const incorrectGuessMessage2: IncorrectGuessMessage = {
          word: wordGuessMessage.word,
          sequence: this.wordGame.currentSequence.stringSequence,
          reason: GuessResult.WORD_DO_NOT_MATCH_SEQUENCE,
          playerId: wordGuessMessage.playerId,
        }

        this.broadcastWordGameMessage(WordGameMessageType.IncorrectGuess, incorrectGuessMessage2);

        this.events.emit('onIncorrectGuess', {
          playerGuessing: player,
          word: wordGuessMessage.word,
          sequence: wordGuessMessage.sequence,
          reason: result,
          admin: this.getAdminPlayer()
        });
        break;
      default:
        // writeErr('Internal error');
        console.error(`GuessResult '${result} is unknown`);
    }
    // TODO : test œuf
  }

  public async newGuess (startingId?: number) {
    // TODO : do not use clearTimeout but something else, so that this notion does not appear in this class
    this.clearTimer();

    if (startingId !== undefined) {
      this.currentId = startingId
    } else {
      this.currentId += 1
    }

    if (this.currentId >= this.players.length) {
      this.currentId = 0
    }
    const player = this.players[this.currentId]

    this.wordGame.getNewSequence();
    const occurrences = this.wordGame.currentDatabase.getSequenceOccurences(this.wordGame.currentSequence.stringSequence);
    
    const lettersToGuessMessage: LettersToGuessMessage = {
      letters: this.currentSequence,
      occurrences: occurrences,
      timeToGuess: this.settings.timePerGuess,
      playerId: player.user.peer.id
    }

    console.log('current id ' + this.currentId);
    console.log('currentPlayerId ' + this.playerIdCurrentlyPlaying);

    this.playerIdCurrentlyPlaying = player.user.peer.id;

    this.broadcastWordGameMessage(WordGameMessageType.LettersToGuess, lettersToGuessMessage);

    this.events.emit('onSequenceToGuess', {
      player,
      sequence: this.currentSequence,
      timeToGuess: this.settings.timePerGuess,
      occurrences,
      admin: this.getAdminPlayer()
    });

    this.startTimer();

    // this.timer.startTimer()
  }

  // FIXME : should the responsibility to attempt a guess or send a message be here ?
  public sendMessage (stringMessage: string) {
    console.log("sendMessage");
    console.log(this.gameStarted);
    console.log(this.isGuessing);

    if (this.gameStarted && this.isGuessing) {
      const wordGuessMessage: WordGuessMessage = {
        word: stringMessage,
        sequence: this.currentSequence,
        language: this.wordGame.currentLanguage,
        playerId: this.localPlayer.user.peer.id,
      }

      // FIXME : this was being this way for Vue, so that we can display guesses of the players
      /*
      if (this.localPlayer === undefined) {
        console.warn('self player is undefined')
      } else {
        ownPlayer.currentGuess = stringMessage
      }
      */

      this.broadcastWordGameMessage(WordGameMessageType.WordGuess, wordGuessMessage);

      this.events.emit('onGuessAttempt', {
        playerGuessing: this.localPlayer,
        word: stringMessage,
        sequence: this.currentSequence,
        admin: this.getAdminPlayer(),
      });

      if (this.isLocalUserAdmin) {
        this.verifyGuess(wordGuessMessage);
      }

    } else {
      this.p2pRoom.broadcastTextMessage(stringMessage);
    }

    // this.pushMessage(new Message('me', stringMessage, ''))
  }

  // TODO : bind disconnections to the game

  public handleAppMessage (emittor: User, anyMessage: AnyMessage, root: Message) {
    console.log('handleAppMessage');

    let message: WordGameMessage = WordGameMulti.getWordGameMessage(anyMessage);

    // Info : not necessarely the admin
    let playerEmittor: Player = this.getPlayerByPeerId(emittor.peer.id);

    // TODO : secure this, only admin should send game messages
    if (isRoomMessageTypeProtected(message.wordGameMessageType) && emittor.peer.id !== this.getAdminPlayer().user.peer.id) {
      
      console.warn('Received a message of type ' + message.wordGameMessageType + ' which is protected and the player is not an admin');
      
      this.events.emit('onAdminActionAttempted', {
        player: playerEmittor,
        messageType: message.wordGameMessageType,
        admin: this.getAdminPlayer()
      });

      return;
    }

    // TODO : move all that into separate methods ?
    // TODO : put message formatting into separate class, can then translate it into fr / en
    switch (message.wordGameMessageType) {
      case WordGameMessageType.InitGame:

        const initGameMessage: InitGameMessage = message.payload as InitGameMessage;

        // Info : we give adminship of the game to the user initializing it
        this._adminId = emittor.peer.id;
        this.userInitializer = emittor;
        this.joinGameRequestId = initGameMessage.request.id;

        if (initGameMessage.playersIds === undefined) {
          // FIXME : kind of warning that could be displayed or historized
          console.warn("playersIds is undefined");
          console.warn(root, message, initGameMessage);
        }

        this.players = this.getPlayersFromPeerIds(initGameMessage.playersIds);

        this.events.emit('onJoinGameRequested', {
          initializer: emittor,
          responseTimeout: initGameMessage.request.timeout,
          settings: this.settings,
          players: this.players,
          admin: this.getAdminUser()
        });

        // TODO : should delete the game after the timeout

        break;

      case WordGameMessageType.InitGameResponse:
        // pass
        break;

      case WordGameMessageType.StartingGame:
        
        // Info : everything is handled here
        this.gameStarted = true;
        this.clearTimer();

        const startingGameMessage = message.payload as StartingGameMessage;

        this.players = this.getPlayersFromPeerIds(startingGameMessage.playersIds);

        break;
      case WordGameMessageType.LettersToGuess:
        const lettersToGuessMessage = message.payload as LettersToGuessMessage;

        // Info : if we have received this message, we are not admin
        this._currentSequence = lettersToGuessMessage.letters;

        this.playerIdCurrentlyPlaying = lettersToGuessMessage.playerId;

        // TODO : add a settings to indicate wether or not this should be synchronized
        this.clearTimer();
        this.startTimer();

        const playerPlaying = this.getPlayerByPeerId(lettersToGuessMessage.playerId);

        this.events.emit('onSequenceToGuess', {
          player: playerPlaying,
          sequence: lettersToGuessMessage.letters,
          timeToGuess: lettersToGuessMessage.timeToGuess,
          occurrences: lettersToGuessMessage.occurrences,
          admin: this.getAdminPlayer()
        });

        break;
      case WordGameMessageType.WordGuess:
        const wordGuessMessage = message.payload as WordGuessMessage;

        if (this.playerIdCurrentlyPlaying !== emittor.peer.id) {
          console.warn('player attempting to guess when not his turn');// TODO : should probably throw ? could happen at last instant of guess turn
          return;
        }

        // Info : this is for displaying the guesses of the players in Vue
        //player.currentGuess = wordGuessMessage.word

        if (this.isLocalUserAdmin) {
          this.verifyGuess(wordGuessMessage)
        }

        break;
      case WordGameMessageType.IncorrectGuess:
        const incorrectGuessMessage = message.payload as IncorrectGuessMessage;

        this.events.emit('onIncorrectGuess', {
          playerGuessing: this.getPlayerByPeerId(incorrectGuessMessage.playerId),
          word: incorrectGuessMessage.word,
          sequence: incorrectGuessMessage.sequence,
          reason: incorrectGuessMessage.reason,
          admin: this.getAdminPlayer()
        });
        break;
      case WordGameMessageType.CorrectGuess:
        const correctGuessMessage = message.payload as CorrectGuessMessage;

        console.log('correct guess, points : ' + correctGuessMessage.points);

        const playerGuessing = this.getPlayerByPeerId(correctGuessMessage.playerId);
        if (playerGuessing === undefined) {
          console.warn(`player ${correctGuessMessage.playerId} not found, cannot had score to him`);
        } else {
          playerGuessing.score += correctGuessMessage.points;
        }

        this.events.emit('onCorrectGuess', {
          playerGuessing,
          word: correctGuessMessage.word,
          sequence: correctGuessMessage.sequence,
          scoreAdded: correctGuessMessage.points,
          reason: correctGuessMessage.reason,
          admin: this.getAdminPlayer()
        });

        this.clearTimer();

        break;
      case WordGameMessageType.GuessTimeout:
        console.log('guess timeout');

        const guessTimeoutMessage = message.payload as GuessTimeoutMessage;
        
        // Info !important: there was a HTML element access here

        this.events.emit('onGuessTimeout', {
          player: this.getPlayerByPeerId(guessTimeoutMessage.playerId),
          admin: this.getAdminPlayer(),
        });

        this.clearTimer();
        
        // this.timer.startTimer()

        break;
      case WordGameMessageType.PlayerWon:
        const playerWonMessage = message.payload as PlayerWonMessage;
        
        // TODO : verify the score locally
        // TODO : indicate if there is an anomaly
        if (playerWonMessage.playerId !== this.playerIdCurrentlyPlaying) {
          
          console.warn("player not playing has won");

          // TODO : better handling of that : player disconnecting
        }

        this.events.emit('onPlayerWon', {
          winner: this.getPlayerByPeerId(playerWonMessage.playerId),
          from: playerEmittor,
          admin: this.getAdminPlayer(),
        });

        this.gameStarted = false;

        this.clearTimer();
        break;
      case WordGameMessageType.WordExample:
        const wordExampleMessage = message.payload as WordExampleMessage;

        this.events.emit('onWordExample', {
          example: wordExampleMessage.word,
          sequence: wordExampleMessage.letters,
          admin: this.getAdminPlayer()
        });

        break;
      case WordGameMessageType.UpdateSettings:
        const updateSettingsMessage = message.payload as UpdateSettingsMessage;

        const formerSettings = this.settings;

        this.settings = updateSettingsMessage.settings;

        this.events.emit('onSettingsUpdated', {
          newSettings: updateSettingsMessage.settings,
          formerSettings,
          player: playerEmittor,
          admin: this.getAdminPlayer(),
        });

        break;
      case WordGameMessageType.RemovePlayer:
        const removePlayerMessage = message.payload as RemovePlayerMessage;

        this.removePlayerByPeerId(removePlayerMessage.playerId, true, emittor.peer.id);

        break;
      case WordGameMessageType.TransferAdminship:
          const transferGameAdminshipMessage = message.payload as TransferGameAdminshipMessage;
  
          this.doTransferGameAdminship(transferGameAdminshipMessage.newAdminPlayerId);

          break;
      default:
        console.warn('received unknown message type ' + message.wordGameMessageType);
        console.warn(message);
        throw new Error('unknown peer message type ' + message.wordGameMessageType);
    }
  }

  public guessTimeout () {
    console.log('guess timeout');
    if (!this.isLocalUserAdmin) {
      console.log(this)
      console.log('guess timeout, not the owner, doing nothing (' + this.room?.roomOwner.id + '!=' + this.localPlayer.user.peer.id + ')')
      return;
    }

    // TODO : need a getter for this
    const playerPlaying: Player = this.getPlayerByPeerId(this.playerIdCurrentlyPlaying);
    
    // Info : this make sense only if the player is the admin ?
    this.events.emit('onGuessTimeout', {
      player: playerPlaying,
      admin: this.getAdminPlayer(),
    });

    // Info !important : there was a document access there for the Vue project

    const guessTimeoutMessage: GuessTimeoutMessage = {
      playerId: playerPlaying.user.peer.id,
    }

    this.broadcastWordGameMessage(WordGameMessageType.GuessTimeout, guessTimeoutMessage);

    this.getAndSendWordExample();

    this.newGuess();
  }

  private startTimer() {
    this.currentTimer = setTimeout(
      this.guessTimeout.bind(this),
      this.settings.timePerGuess * 1000
    )
  }

  private clearTimer() {
    clearTimeout(this.currentTimer);
  }

  public getPlayerByPeerId (peerId: string): Player | undefined {
    for (let i = 0; i < this.players.length; i++) {
      const player: Player = this.players[i]
      if (player.user.peer.id === peerId) return player;
    }
    return undefined;
  }

  // TODO : use a getter ?
  private _adminId: string = "";
  public getAdminPlayer(): Player | undefined {
    let adminId: string = this.adminId;
    return this.getPlayerByPeerId(adminId);
  }
  public getAdminUser(): User | undefined {
    let adminId: string = this.adminId;
    return this.p2pRoom.getUserByPeerId(adminId);
  }
  
  public getAndSendWordExample () {
    const word = this.wordGame.getExampleForSequence();

    const wordExampleMessage: WordExampleMessage = {
      word: word,
      letters: this.currentSequence
    }

    this.broadcastWordGameMessage(WordGameMessageType.WordExample, wordExampleMessage);

    this.events.emit('onWordExample', {
      example: word,
      sequence: this.currentSequence,
      admin: this.getAdminPlayer()
    });
  }

  public playerIsGuessing (peerId: string) {
    return this.playerIdCurrentlyPlaying === peerId
  }

  public updateSettings (settings: IWordGameMultiSettings) {
    if (!this.isLocalUserAdmin) {
      this.events.emit('onAdminActionAttempted', {
        player: this.localPlayer,
        messageType: WordGameMessageType.UpdateSettings,
        admin: this.getAdminPlayer()
      });
      return;
    }
    this.settings = { ...settings }
    this.wordGame.wordGameOptions = settings;

    this.broadcastNewSettings();
  }

  public broadcastNewSettings() {
    const updateSettingsMessage: UpdateSettingsMessage = {
      settings: this.settings
    }

    this.broadcastWordGameMessage(WordGameMessageType.UpdateSettings, updateSettingsMessage);
  }

  // TODO : test this
  public removePlayerByPeerId(id: string, isMessage: boolean = false, emitterId: string = ""): Player {
    const removingOurself = this.localPlayer?.user.peer.id === id;

    if (!this.isLocalUserAdmin && !isMessage &&!removingOurself && emitterId != this.adminId) {
      this.events.emit('onAdminActionAttempted', {
        player: this.localPlayer,
        messageType: WordGameMessageType.RemovePlayer,
        admin: this.getAdminPlayer()
      });
      return undefined;
    }

    // TODO : if it is the player's turn
    // then new turn
    // if there is still players

    if (removingOurself) {
      if (this.isLocalUserAdmin) {
        this.execTransferGameAdminship()
      }
    }

    const newPlayers = [];
    let removedPlayer: Player = undefined;
    this.players.forEach((player: Player) => {
      if (player.user.peer.id === id) {
        removedPlayer = player;
        return;
      }
      newPlayers.push(player);
    });
    if (removedPlayer !== undefined) {

      this.players = newPlayers;

      if (!isMessage && newPlayers.length !== 0) {
        const removePlayerMessage: RemovePlayerMessage = {
          playerId: id,
        }

        this.broadcastWordGameMessage(WordGameMessageType.RemovePlayer, removePlayerMessage);

        // TODO : fix ids
        // TODO : fix turn
      }

      this.events.emit('onPlayerRemoved', {
        player: removedPlayer,
        from: this.localPlayer,
        admin: this.getAdminPlayer()
      });

      return removedPlayer;

    } else {
      // TODO : log amessage
      console.warn(`Player of id ${id} was not found`);
      return undefined;
    }
  }

  public modifySettingsProperty(propertyName: string, propertyValue: string): void {
    if (!this.isLocalUserAdmin) {
      // FIXME : not exactly that
      this.events.emit('onAdminActionAttempted', {
        player: this.localPlayer,
        messageType: WordGameMessageType.UpdateSettings,
        admin: this.getAdminPlayer()
      });
      return undefined;
    }

    // Info : this does nothing, it will return a string either way
    const key: KeyOfSettings = propertyName as KeyOfSettings;

    const formerSettings = { ...this.settings };

    // Info : we could assign the property this way
    // this.settings[propertyName] = propertyValue;
    // But this is cleaner
    switch (key) {
      case 'guessAsSession':
        let value = /true/.test(propertyValue);
        this.settings.guessAsSession = value;
        break;
      case 'maxAttempts':
        this.settings.maxAttempts = Number.parseInt(propertyValue, 10);
        break;
      case 'minOccurences':
        this.settings.minOccurences = Number.parseInt(propertyValue, 10);
        break;
      case 'maxOccurences':
        this.settings.maxOccurences = Number.parseInt(propertyValue, 10);
        break;
      case 'timePerGuess':
        this.settings.timePerGuess = Number.parseInt(propertyValue, 10);
        break;
      case 'winningScore':
        this.settings.winningScore = Number.parseInt(propertyValue, 10);
        break;
      case 'language':
        // Info : for now, word game is handling the language state of the sequence
        switch(propertyValue) {
          case 'fra':
          case 'french':
            this.settings.language = "fra";
            break;
          case 'eng':
          case 'english':
            this.settings.language = "eng";
            break;
          default:
            throw new Error(`unknown language '${propertyValue}'`);
        }
        return;
      default:
        throw new Error('key ' + propertyName + ' is unknown');
    }

    this.broadcastNewSettings();
    
    this.events.emit('onSettingsUpdated', {
      newSettings: this.settings,
      formerSettings,
      player: this.localPlayer,
      admin: this.getAdminPlayer()
    });
  }

  protected execTransferGameAdminship() {
    if (!this.isLocalUserAdmin) {
      console.warn(`attempting to transfer game adminship while not being the admin (which is ${this.adminId}`);
      return;
    }
    if (this.players.length <= 1) {
      console.warn(`attempting to transfer game ownership while being alone in the game`);
      return;
    }
    let newGameAdminId: string = "";
    for (const player of this.players) {
      if (player.user.peer.id === this.localPlayer.user.peer.id) {
        continue;
      }
      newGameAdminId = player.user.peer.id;
      break;
    }
    if (newGameAdminId === "") {
      console.warn(`did not find a new owner`);
      return;
    }
    // FIXME : find a better way to send messages than this
    const transferGameAdminshipMessage = {
      newAdminPlayerId: newGameAdminId,
    } as TransferGameAdminshipMessage;
    
    this.broadcastWordGameMessage(WordGameMessageType.TransferAdminship, transferGameAdminshipMessage);
  }

  protected doTransferGameAdminship(newAdminUserId: string) {
    this._adminId = newAdminUserId;
  }

  public leave() {
    this.removePlayerByPeerId(this.localPlayer.user.peer.id, false);
  }

  protected broadcastWordGameMessage(messageType: WordGameMessageType, payload: any) {
    const message = {
      wordGameMessageType: messageType,
      payload: payload
    } as WordGameMessage;
    const appMessage: AppMessage = {
      app: appName,
      payload: message
    };

    this.p2pRoom.broadcastApplicationMessage(appMessage);
  }

  protected getUsersAsPlayers(): Player[] {
    const players: Player[] = [];
    console.log('clients');
    console.log(this.room.clients);

    this.p2pRoom.users.forEach((user, key) => {
      const player = {
        user: user,
        score: 0,
      } as Player;

      players.push(player);
    });

    return players;
  }

  protected getPlayersFromPeerIds(peerIds: string[]): Player[] | undefined {
    const players: Player[] = [];

    if (peerIds.length === 0) {
      console.warn("attempting to initializing the players from an empty list of peers");
      return undefined;
    }

    peerIds.forEach(id => {
      if (this.room.clients.get(id) === undefined) {
        console.warn(`received an id which is not defined in the servers room ${id}`);
      }
      const user = this.p2pRoom.getUser(id);
      if (user === undefined) {
        console.error(`received an id which is not defined in the p2p room ${id}`);
        return;
      }

      // FIXME (low) : mutualize with the other method ?
      const player = {
        user: user,
        score: 0,
      } as Player;

      players.push(player);
    });
    return players;
  }

  // #endregion

}
