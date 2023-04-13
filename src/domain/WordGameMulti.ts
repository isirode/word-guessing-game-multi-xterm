import { IRoom } from './models/Room';
import {
  WordGameMessageType, ChatMessage, StartingGameMessage,
  LettersToGuessMessage, WordGuessMessage, IncorrectGuessMessage, CorrectGuessMessage, GuessTimeoutMessage,
  PlayerWonMessage, UpdatePlayerNameMessage, isRoomMessageTypeProtected, WordExampleMessage, UpdateSettingsMessage, WordGameMessage
} from './models/Message';
import { Connection } from './models/Connection';
import { ITimer } from './models/Timer';
import { IPeer } from './models/Peer';
import { FrenchWordDatabase } from 'word-guessing-game-common';
import { IWordGameMessaging } from './ports/secondary/locale/IWordGameMessaging';
import { IWordGameMultiSettings } from './ports/secondary/IWordGameMultiSettings';
import { WordGame, GuessResult } from 'word-guessing-lib';
import { AnyMessage, AppMessageHandler, Message, P2PRoom, User, getApplicationMessage, sanitizeUser } from './P2PRoom';
import { Player, sanitizePlayer } from './models/Player';

export interface WordGameMessageHandler {
  onStartingGame: (settings: IWordGameMultiSettings, players: Player[], admin: Player) => void;
  onPlayerWon: (winner: Player, from: Player, admin: Player) => void;
  onAdminActionAttempted: (player: Player, messageType: WordGameMessageType, admin: Player) => void;

  onSequenceToGuess: (player: Player, sequence: string, timeToGuess: number, admin: Player) => void;
  onGuessAttempt: (playerGuessing: Player, word: string, sequence: string, admin: Player) => void;
  onIncorrectGuess: (playerGuessing: Player, word: string, sequence: string, reason: GuessResult, admin: Player) => void;
  onCorrectGuess: (playerGuessing: Player, word: string, sequence: string, scoreAdded: number, reason: GuessResult, admin: Player) => void;
  onGuessTimeout: (player: Player, admin: Player) => void;

  onWordExample: (example: string, sequence: string, admin: Player) => void;
  onSettingsUpdated: (newSettings: IWordGameMultiSettings, formerSettings: IWordGameMultiSettings, player: Player, admin: Player) => void;
}

export type OnMessagePushed = (message: Message) => void;

// TODO : use an interface
// import TimerType from  '../components/Timer.vue'

// TODO : interval seem to be paused (Brave) when tab is not active / switch
// difficult to test

// TODO : remove player if disconnect ?

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

  public localeMessaging: IWordGameMessaging;

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

  // #endregion

  // #region "Computed properties"

  // FIXME : if we use getter, we need to synchronize it for each clients
  // Not sure we want to do this
  // get gameStarted(): boolean {
  //   // TODO : rename or a add a property isPlaying or equivalent in the offline WordGame
  //   return this.wordGame.isGuessing;
  // }

  get currentSequence(): string {
    if (this.isAdmin) {
      return this.wordGame.currentSequence;
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
    return this.isAdmin && !this.gameStarted;
  }

  get isGuessing (): boolean {
    return this.localPlayer.user.peer?.id === this.playerIdCurrentlyPlaying;
  }

  get isAdmin (): boolean {
    return this.room?.roomOwner.id === this.localPlayer.user.peer.id;
  }

  // #endregion

  constructor (room: IRoom, wordGame: WordGame, p2pRoom: P2PRoom, localeMessaging: IWordGameMessaging, settings: IWordGameMultiSettings, wordGameMessageHandler: WordGameMessageHandler) {
    this.room = room;
    this.wordGame = wordGame;
    this.p2pRoom = p2pRoom;
    //this.timer = timer
    this.localeMessaging = localeMessaging;
    this.settings = settings;
    this.wordGameMessageHandler = wordGameMessageHandler;

    // TODO : init player

    const self = this;
    const appMessageHandler: AppMessageHandler = {
      onAppMessage: function (user: User, message: AnyMessage, root: Message): void {
        self.handleAppMessage(user, message, root);
      }
    }

    this.localPlayer = {
      user: p2pRoom.localUser,
      score: 0,
    } as Player;

    this.p2pRoom.appMessageHandler = appMessageHandler;

    // this.onMessagePushedCallback = onMessagePushedCallback;
  }

  // #region "Methods"

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
    }
    const message: WordGameMessage = {
      wordGameMessageType: WordGameMessageType.StartingGame,
      payload: startingGameMessage
    }

    this.p2pRoom.broadcastApplicationMessage(message);

    // FIXME : Could wait or something else ?

    const id = Math.floor(Math.random() * this.players.length);
    this.newGuess(id);

    // Info : we have to set it manually
    this.gameStarted = true;
    

    // this.timer.startTimer()


    // FIXME : better way to do this
    // this.updateLocalPlayerName(this.name)
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

    if (wordGuessMessage.sequence !== this.wordGame.currentSequence) {
      console.warn(`Local sequence (${this.currentSequence}) and message sequence (${wordGuessMessage.sequence}) are different`);
    }

    const result = this.wordGame.verifyGuess(wordGuessMessage.word);

    const player = this.getPlayerByPeerId(wordGuessMessage.playerId);
    if (player === undefined) {
      console.warn('player is undefined');
    }

    switch (result) {
      case GuessResult.SUCCESSFUL_GUESS:
        console.log('Success !');
        // TODO : different way of computing score
        const score = wordGuessMessage.word.length;

        // const player = this.addScoreToPlayer(this.playerIdCurrentlyPlaying, score);

        player.score += score;

        const sanitizedPlayer = sanitizePlayer(player);

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
        // FIXME : we cannot use a single 'message' variable xD
        let message1: WordGameMessage = {
          wordGameMessageType: WordGameMessageType.CorrectGuess,
          payload: correctGuessMessage
        }

        this.p2pRoom.broadcastApplicationMessage(message1);

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
          const wordGameMessage: WordGameMessage = {
            wordGameMessageType: WordGameMessageType.PlayerWon,
            payload: playerWonMessage
          };
          this.p2pRoom.broadcastApplicationMessage(wordGameMessage);

          this.wordGameMessageHandler.onPlayerWon(player, this.localPlayer, this.getAdmin());

          // this.pushMessage(new Message('game (' + this.peer.id + ')', this.localeMessaging.formatPlayerHasWon(playerWonMessage.playerId, playerWonMessage.score), ''))
  
          // TODO : add an option to restart a game if necessary
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
          sequence: this.wordGame.currentSequence,
          reason: GuessResult.WORD_DO_NOT_EXIST,
          playerId: wordGuessMessage.playerId,
        }
        let message2: WordGameMessage = {
          wordGameMessageType: WordGameMessageType.IncorrectGuess,
          payload: incorrectGuessMessage1
        }

        this.p2pRoom.broadcastApplicationMessage(message2);

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
          sequence: this.wordGame.currentSequence,
          reason: GuessResult.WORD_DO_NOT_MATCH_SEQUENCE,
          playerId: wordGuessMessage.playerId,
        }
        let message3: WordGameMessage = {
          wordGameMessageType: WordGameMessageType.IncorrectGuess,
          payload: incorrectGuessMessage2
        }

        this.p2pRoom.broadcastApplicationMessage(message3);

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

  public newGuess (startingId?: number) {
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
    
    const lettersToGuessMessage: LettersToGuessMessage = {
      letters: this.currentSequence,
      timeToGuess: this.settings.timePerGuess,
      playerId: player.user.peer.id
    }

    const secondMessage: WordGameMessage = { // TODO : rename
      wordGameMessageType: WordGameMessageType.LettersToGuess,
      payload: lettersToGuessMessage
    }

    console.log('current id ' + this.currentId);
    console.log('currentPlayerId ' + this.playerIdCurrentlyPlaying);

    this.playerIdCurrentlyPlaying = player.user.peer.id;

    this.p2pRoom.broadcastApplicationMessage(secondMessage);

    this.wordGameMessageHandler.onSequenceToGuess(
      player,
      this.currentSequence,
      this.settings.timePerGuess,
      this.getAdmin()
    );

    this.startTimer();

    // this.timer.startTimer()
  }

  // FIXME : should the responsibility to attempt a guess or send a message be here ?
  public sendMessage (stringMessage: string) {
    let message: WordGameMessage;

    console.log('send message');
    console.log(this.gameStarted);
    console.log(this.isGuessing);

    if (this.gameStarted && this.isGuessing) {
      const wordGuessMessage: WordGuessMessage = {
        word: stringMessage,
        sequence: this.currentSequence,
        playerId: this.localPlayer.user.peer.id,
      }
      message = {
        wordGameMessageType: WordGameMessageType.WordGuess,
        payload: wordGuessMessage
      }

      // FIXME : this was being this way for Vue, so that we can display guesses of the players
      /*
      if (this.localPlayer === undefined) {
        console.warn('self player is undefined')
      } else {
        ownPlayer.currentGuess = stringMessage
      }
      */

      this.p2pRoom.broadcastApplicationMessage(message);

      this.wordGameMessageHandler.onGuessAttempt(
        this.localPlayer,
        stringMessage,
        this.currentSequence,
        this.getAdmin(),
      );

      if (this.isAdmin) {
        this.verifyGuess(wordGuessMessage);
      }

    } else {
      this.p2pRoom.sendMessage(stringMessage);
    }

    // this.pushMessage(new Message('me', stringMessage, ''))
  }

  // TODO : bind disconnections to the game

  public handleAppMessage (user: User, anyMessage: AnyMessage, root: Message) {
    console.log('handleAppMessage');

    const message: WordGameMessage = anyMessage as WordGameMessage;

    // Info : not necessarely the admin
    let playerEmittor: Player = this.getPlayerByPeerId(user.peer.id);

    if (playerEmittor === undefined) {
      console.warn("player is undefined, should not be");
    }

    // TODO : secure this, only admin should send game messages
    if (isRoomMessageTypeProtected(message.wordGameMessageType) && user.peer.id !== this.room.roomOwner.id) {
      
      console.warn('Received a message of type ' + message.wordGameMessageType + ' which is protected and the player is not an admin');
      
      this.wordGameMessageHandler.onAdminActionAttempted(playerEmittor, message.wordGameMessageType, this.getAdmin());

      return;
    }

    // TODO : move all that into separate methods ?
    // TODO : put message formatting into separate class, can then translate it into fr / en
    switch (message.wordGameMessageType) {
      case WordGameMessageType.StartingGame:
        
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
          this.localPlayer
        );

        break;
      case WordGameMessageType.WordGuess:
        const wordGuessMessage = message.payload as WordGuessMessage;

        if (this.playerIdCurrentlyPlaying !== user.peer.id) {
          console.warn('player attempting to guess when not his turn');// TODO : should probably throw ? could happen at last instant of guess turn
          return;
        }

        // Info : this is for displaying the guesses of the players in Vue
        //player.currentGuess = wordGuessMessage.word

        if (this.isAdmin) {
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
      default:
        console.warn('received unknown message type ' + message.wordGameMessageType);
        console.warn(message);
        throw new Error('unknown peer message type ' + message.wordGameMessageType);
    }
  }

  public guessTimeout () {
    console.log('guess timeout');
    if (!this.isAdmin) {
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
    const message = {
      wordGameMessageType: WordGameMessageType.GuessTimeout,
      payload: guessTimeoutMessage
    } as WordGameMessage;

    this.p2pRoom.broadcastApplicationMessage(message);

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
  public getAdmin(): Player | undefined {
    const adminId = this.room?.roomOwner;
    return this.getPlayerByPeerId(adminId.id);
  }
  
  public getAndSendWordExample () {
    const word = this.wordGame.getExampleForSequence();

    const wordExampleMessage: WordExampleMessage = {
      word: word,
      letters: this.currentSequence
    }
    const message = {
      wordGameMessageType: WordGameMessageType.WordExample,
      payload: wordExampleMessage
    } as WordGameMessage;

    this.p2pRoom.broadcastApplicationMessage(message);

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
    if (!this.isAdmin) {
      return
    }
    this.settings = { ...settings }
    this.wordGame.wordGameOptions = settings;

    const updateSettingsMessage: UpdateSettingsMessage = {
      settings: this.settings
    }
    const message = {
      wordGameMessageType: WordGameMessageType.UpdateSettings,
      payload: updateSettingsMessage
    } as WordGameMessage;

    this.p2pRoom.broadcastApplicationMessage(message);
  }

  // #endregion

}
