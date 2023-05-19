import { AppMessage, IRoom } from 'peerjs-room';
import {
  WordGameMessageType, StartingGameMessage,
  LettersToGuessMessage, WordGuessMessage, IncorrectGuessMessage, CorrectGuessMessage, GuessTimeoutMessage,
  PlayerWonMessage, isRoomMessageTypeProtected, WordExampleMessage, UpdateSettingsMessage, WordGameMessage, RemovePlayerMessage, TransferGameAdminshipMessage
} from './models/Message';
import { IWordGameMultiSettings } from './settings/IWordGameMultiSettings';
import { WordGame, GuessResult, SupportedLanguages } from 'word-guessing-lib';
// import { AnyMessage, AppMessageHandler, Message, P2PRoom, User } from './P2PRoom';
import { AnyMessage, Events as RoomEvents, Message, P2PRoom, User } from 'peerjs-room';
import { Player } from './models/Player';
import Emittery from 'emittery';

export interface WordGameMessageHandler {
  onStartingGame(settings: IWordGameMultiSettings, players: Player[], admin: Player): void;
  onPlayerWon(winner: Player, from: Player, admin: Player): void;
  onAdminActionAttempted(player: Player, messageType: WordGameMessageType, admin: Player): void;

  onSequenceToGuess(player: Player, sequence: string, timeToGuess: number, occurrences: number, admin: Player): void;
  onGuessAttempt(playerGuessing: Player, word: string, sequence: string, admin: Player): void;
  onIncorrectGuess(playerGuessing: Player, word: string, sequence: string, reason: GuessResult, admin: Player): void;
  onCorrectGuess(playerGuessing: Player, word: string, sequence: string, scoreAdded: number, reason: GuessResult, admin: Player): void;
  onGuessTimeout(player: Player, admin: Player): void;

  onWordExample(example: string, sequence: string, admin: Player): void;
  onSettingsUpdated(newSettings: IWordGameMultiSettings, formerSettings: IWordGameMultiSettings, player: Player, admin: Player): void;

  onPlayerRemoved(player: Player, from: Player, admin: Player | undefined): void;
}

export type OnMessagePushed = (message: Message) => void;

export interface Events {
  beforeNewGuess: undefined;
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
  players: Player[] = []

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

  // TODO : replace it by an queue or something like that
  onMessagePushedCallback: OnMessagePushed;

  // FIXME : should probably be an interface
  p2pRoom: P2PRoom;

  wordGameMessageHandler: WordGameMessageHandler;

  events: Emittery<Events>;

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
    if (this.room.roomOwner.id === this.localPlayer.user.peer.id) {
      return true;
    }
    return false;
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

  // #endregion

  constructor (room: IRoom, p2pRoom: P2PRoom, wordGame: WordGame, settings: IWordGameMultiSettings, wordGameMessageHandler: WordGameMessageHandler) {
    this.room = room;
    this.p2pRoom = p2pRoom;
    this.wordGame = wordGame;
    //this.timer = timer
    this.settings = settings;
    this.wordGameMessageHandler = wordGameMessageHandler;

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

  public startGame () {
    // TODO : only the owner
    console.log('start game');

    if (this.canStartGame === false) {
      console.log('cannot start game');
      // FIXME : should be handled this way ?
      this.wordGameMessageHandler.onAdminActionAttempted(this.localPlayer, WordGameMessageType.StartingGame, this.getAdmin());
      return;
    }

    console.log('starting game');

    this.initiatePlayers();

    this.wordGameMessageHandler.onStartingGame(
      this.settings,
      this.players,
      this.getAdmin()
    );

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

  // TODO : use room or refresh room
  // When a player refresh the web page, he leaves, he should be removed, but he is not put back in
  public initiatePlayers () {
    // For now, we take all user presently in the room
    this.players = [];
    console.log('clients');
    console.log(this.room.clients);

    this.p2pRoom.users.forEach((user, key) => {
      const player = {
        user: user,
        score: 0,
      } as Player;

      this.players.push(player);
    });
  }

  public initiatePlayersFromPeerIds(peerIds: string[]) {
    this.players = [];

    if (peerIds.length === 0) {
      console.warn("attempting to initializing the players from an empty list of peers");
      return;
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

      this.players.push(player);
    });

  }

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

        this.wordGameMessageHandler.onCorrectGuess(
          player,
          wordGuessMessage.word,
          wordGuessMessage.sequence,
          score,
          result,
          this.getAdmin()
        );
  
        if (player !== undefined && player.score >= this.settings.winningScore) {
  
          this.clearTimer();
          // this.timer.clearInterval()
  
          console.log('player ' + player.user.peer.id + ' has won');

          const playerWonMessage: PlayerWonMessage = {
            playerId: player.user.peer.id,
            score: player.score
          }
          this.broadcastWordGameMessage(WordGameMessageType.PlayerWon, playerWonMessage);

          this.wordGameMessageHandler.onPlayerWon(player, this.localPlayer, this.getAdmin());

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

        this.wordGameMessageHandler.onIncorrectGuess(
          player,
          wordGuessMessage.word,
          wordGuessMessage.sequence,
          result,
          this.getAdmin()
        );

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

        this.wordGameMessageHandler.onIncorrectGuess(
          player,
          wordGuessMessage.word,
          wordGuessMessage.sequence,
          result,
          this.getAdmin()
        );
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

    await this.events.emit('beforeNewGuess');

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
    const occurences = this.wordGame.currentDatabase.getSequenceOccurences(this.wordGame.currentSequence.stringSequence);
    
    const lettersToGuessMessage: LettersToGuessMessage = {
      letters: this.currentSequence,
      occurences: occurences,
      timeToGuess: this.settings.timePerGuess,
      playerId: player.user.peer.id
    }

    console.log('current id ' + this.currentId);
    console.log('currentPlayerId ' + this.playerIdCurrentlyPlaying);

    this.playerIdCurrentlyPlaying = player.user.peer.id;

    this.broadcastWordGameMessage(WordGameMessageType.LettersToGuess, lettersToGuessMessage);

    this.wordGameMessageHandler.onSequenceToGuess(
      player,
      this.currentSequence,
      this.settings.timePerGuess,
      occurences,
      this.getAdmin()
    );

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

      this.wordGameMessageHandler.onGuessAttempt(
        this.localPlayer,
        stringMessage,
        this.currentSequence,
        this.getAdmin(),
      );

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

    if (playerEmittor === undefined) {
      console.warn("player is undefined, should not be");
    }

    // TODO : secure this, only admin should send game messages
    if (isRoomMessageTypeProtected(message.wordGameMessageType) && emittor.peer.id !== this.room.roomOwner.id) {
      
      console.warn('Received a message of type ' + message.wordGameMessageType + ' which is protected and the player is not an admin');
      
      this.wordGameMessageHandler.onAdminActionAttempted(playerEmittor, message.wordGameMessageType, this.getAdmin());

      return;
    }

    // TODO : move all that into separate methods ?
    // TODO : put message formatting into separate class, can then translate it into fr / en
    switch (message.wordGameMessageType) {
      case WordGameMessageType.StartingGame:
        
        // Info : everything is handled here
        this.gameStarted = true;
        this.clearTimer();

        const startingGameMessage = message.payload as StartingGameMessage;

        this.initiatePlayersFromPeerIds(startingGameMessage.playersIds);
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

        this.wordGameMessageHandler.onSequenceToGuess(
          playerPlaying,
          lettersToGuessMessage.letters,
          lettersToGuessMessage.timeToGuess,
          lettersToGuessMessage.occurences,
          this.localPlayer
        );

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

        this.wordGameMessageHandler.onIncorrectGuess(
          this.getPlayerByPeerId(incorrectGuessMessage.playerId),
          incorrectGuessMessage.word,
          incorrectGuessMessage.sequence,
          incorrectGuessMessage.reason,
          this.getAdmin()
        );
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

        this.wordGameMessageHandler.onCorrectGuess(
          playerGuessing,
          correctGuessMessage.word,
          correctGuessMessage.sequence,
          correctGuessMessage.points,
          correctGuessMessage.reason,
          this.getAdmin()
        );

        this.clearTimer();

        break;
      case WordGameMessageType.GuessTimeout:
        console.log('guess timeout');

        const guessTimeoutMessage = message.payload as GuessTimeoutMessage;
        
        // Info !important: there was a HTML element access here

        this.wordGameMessageHandler.onGuessTimeout(
          this.getPlayerByPeerId(guessTimeoutMessage.playerId),
          this.getAdmin(),
        );

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

        this.wordGameMessageHandler.onPlayerWon(
          this.getPlayerByPeerId(playerWonMessage.playerId),
          playerEmittor,
          this.getAdmin(),
        );

        this.gameStarted = false;

        this.clearTimer();
        break;
      case WordGameMessageType.WordExample:
        const wordExampleMessage = message.payload as WordExampleMessage;

        this.wordGameMessageHandler.onWordExample(
          wordExampleMessage.word,
          wordExampleMessage.letters,
          this.getAdmin()
        );

        break;
      case WordGameMessageType.UpdateSettings:
        const updateSettingsMessage = message.payload as UpdateSettingsMessage;

        const formerSettings = this.settings;

        this.settings = updateSettingsMessage.settings;

        this.wordGameMessageHandler.onSettingsUpdated(
          updateSettingsMessage.settings,
          formerSettings,
          playerEmittor,
          this.getAdmin(),
        );

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
    this.wordGameMessageHandler.onGuessTimeout(
      playerPlaying,
      this.getAdmin(),
    );

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
  public getAdmin(): Player | undefined {
    let adminId: string = this.adminId;
    return this.getPlayerByPeerId(adminId);
  }
  
  public getAndSendWordExample () {
    const word = this.wordGame.getExampleForSequence();

    const wordExampleMessage: WordExampleMessage = {
      word: word,
      letters: this.currentSequence
    }

    this.broadcastWordGameMessage(WordGameMessageType.WordExample, wordExampleMessage);

    this.wordGameMessageHandler.onWordExample(
      word,
      this.currentSequence,
      this.getAdmin()
    );
  }

  public playerIsGuessing (peerId: string) {
    return this.playerIdCurrentlyPlaying === peerId
  }

  public updateSettings (settings: IWordGameMultiSettings) {
    if (!this.isLocalUserAdmin) {
      this.wordGameMessageHandler.onAdminActionAttempted(
        this.localPlayer,
        WordGameMessageType.UpdateSettings,
        this.getAdmin()
      );
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
      this.wordGameMessageHandler.onAdminActionAttempted(
        this.localPlayer,
        WordGameMessageType.RemovePlayer,
        this.getAdmin()
      );
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

      this.wordGameMessageHandler.onPlayerRemoved(
        removedPlayer,
        this.localPlayer,
        this.getAdmin()
      );

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
      this.wordGameMessageHandler.onAdminActionAttempted(
        this.localPlayer,
        WordGameMessageType.UpdateSettings,
        this.getAdmin()
      );
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
    
    this.wordGameMessageHandler.onSettingsUpdated(
      this.settings,
      formerSettings,
      this.localPlayer,
      this.getAdmin()
    );
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

  // #endregion

}
