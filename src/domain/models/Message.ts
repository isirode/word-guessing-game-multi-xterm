import { GuessResult } from "word-guessing-lib";
import { AnyMessage } from "../P2PRoom";
import { IWordGameMultiSettings } from "../ports/secondary/IWordGameMultiSettings";

export enum WordGameMessageType {
  StartingGame = 'starting-game',
  LettersToGuess = 'letters-to-guess',
  WordGuess = 'word-guess',
  IncorrectGuess = 'incorrect-guess',
  CorrectGuess = 'correct-guess',
  GuessTimeout = 'guess-timeout',
  PlayerWon = 'player-won',
  WordExample = 'word-example',
  UpdateSettings = 'update-settings',
  RemovePlayer = "remove-player",
  TransferAdminship = "transfer-adminship",
}

export function isRoomMessageTypeProtected (wordGameMessageType: WordGameMessageType) {
  if (/*roomMessageType === RoomMessageType.Message ||*/
      /*roomMessageType === WordGameMessageType.UpdatePlayerName ||
      roomMessageType === WordGameMessageType.WordExample*/
      wordGameMessageType === WordGameMessageType.WordGuess ||
      wordGameMessageType === WordGameMessageType.RemovePlayer) {
    return false;
  }
  return true;
}

// TODO : most messages should indicate the target so that it can be optionnaly transitionned to an full admin architecture

export interface WordGameMessage extends AnyMessage {
  wordGameMessageType: WordGameMessageType;
  payload: any;
}

export interface ChatMessage {
  message: string;
}
export interface StartingGameMessage {
  playersIds: string[];
}
export interface LettersToGuessMessage {
  letters: string;
  occurences: number;
  timeToGuess: number;
  // FIXME : should it be 'peerId', 'playerPeerId' or keep it this way
  // It make it more difficult to maintain
  // But one could want to redefine users
  playerId: string;
}
export interface WordGuessMessage {
  word: string;
  sequence: string;
  playerId: string;
}
// export enum IncorrectGuessReason {
//   DontMatchLetters = 'dont-match-letters',
//   WordNotFound = 'word-dont-found'
// }
export interface IncorrectGuessMessage {
  // reason: IncorrectGuessReason;
  reason: GuessResult;
  word: string;
  sequence: string;
  playerId: string;
}
export interface CorrectGuessMessage {
  // TODO : add player id, it is currently supposing that all players are correctly synchronized (which player is currently playing)
  // Current system might reduce cheat potential though
  points: number;
  reason: GuessResult;
  word: string;
  sequence: string;
  playerId: string;
}
export interface GuessTimeoutMessage {
  playerId: string;
}
export interface PlayerWonMessage {
  playerId: string
  score: number
}
export interface UpdatePlayerNameMessage {
  name: string;
}
export interface WordExampleMessage {
  word: string
  letters: string
}
export interface SetRoomAdminMessage {
  roomId: string;
  playerId: string;
}
export interface UpdateSettingsMessage {
  settings: IWordGameMultiSettings;
}
export interface RemovePlayerMessage {
  playerId: string;
}
export interface TransferGameAdminshipMessage {
  newAdminPlayerId: string;
}

// FIXME : what to do with these
// I think they are not useful
// And this introduce differences between the fork and PeerJS, if I am not mistaken
// export enum ApplicationMessageType {
//   SetRoomOwner = 'SET-ROOM-OWNER'
// }
// // FIXME : what to do with these
// export interface ApplicationMessage {
//   applicationMessageType: ApplicationMessageType
//   message: any
// }

// Used to emit events
/*
export class Message {
  peer: string
  message: string
  debug: string

  constructor (peer: string, message: string, debug: string) {
    this.peer = peer
    this.message = message
    this.debug = debug
  }

  get toString (): string {
    let value = ''
    if (this.debug != null && this.debug !== '') {
      value += this.debug
    } else {
      value += this.peer
    }

    value += ': '

    value += this.message

    return value
  }
}
*/