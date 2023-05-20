import { GuessResult, SupportedLanguages } from "word-guessing-lib";
import { AnyMessage } from "peerjs-room";
import { IWordGameMultiSettings } from "../settings/IWordGameMultiSettings";
import { Request, Response } from "peerjs-request-response";

export enum WordGameMessageType {
  InitGame = 'init-game',
  InitGameResponse = "init-game-response",
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
      wordGameMessageType === WordGameMessageType.RemovePlayer ||
      wordGameMessageType === WordGameMessageType.InitGame ||
      wordGameMessageType === WordGameMessageType.InitGameResponse ||
      wordGameMessageType === WordGameMessageType.StartingGame) {
    return false;
  }
  return true;
}

// TODO : most messages should indicate the target so that it can be optionnaly transitionned to an full admin architecture

export interface WordGameMessage extends AnyMessage {
  wordGameMessageType: WordGameMessageType;
  payload: any;
}

// Info : empty interface but it will help with the typing
export interface BaseWordGameMessage {

}

// TODO : it should be init with the settings
export interface InitGameMessage extends BaseWordGameMessage {
  request: Request;
  playersIds: string[];
  lang: SupportedLanguages;
}
export interface InitGameResponseMessage extends BaseWordGameMessage {
  response: Response;
}
export interface InitGameResponseBody {
  willJoin: boolean;
}
export interface StartingGameMessage extends BaseWordGameMessage {
  playersIds: string[];
  lang: SupportedLanguages;
}
export interface LettersToGuessMessage extends BaseWordGameMessage {
  letters: string;
  occurrences: number;
  timeToGuess: number;
  // FIXME : should it be 'peerId', 'playerPeerId' or keep it this way
  // It make it more difficult to maintain
  // But one could want to redefine users
  playerId: string;
}
export interface WordGuessMessage extends BaseWordGameMessage {
  word: string;
  sequence: string;
  language: SupportedLanguages;
  playerId: string;
}
// export enum IncorrectGuessReason {
//   DontMatchLetters = 'dont-match-letters',
//   WordNotFound = 'word-dont-found'
// }
export interface IncorrectGuessMessage extends BaseWordGameMessage {
  // reason: IncorrectGuessReason;
  reason: GuessResult;
  word: string;
  sequence: string;
  playerId: string;
}
export interface CorrectGuessMessage extends BaseWordGameMessage {
  // TODO : add player id, it is currently supposing that all players are correctly synchronized (which player is currently playing)
  // Current system might reduce cheat potential though
  points: number;
  reason: GuessResult;
  word: string;
  sequence: string;
  playerId: string;
}
export interface GuessTimeoutMessage extends BaseWordGameMessage {
  playerId: string;
}
export interface PlayerWonMessage extends BaseWordGameMessage {
  playerId: string
  score: number
}
export interface UpdatePlayerNameMessage extends BaseWordGameMessage {
  name: string;
}
export interface WordExampleMessage extends BaseWordGameMessage {
  word: string
  letters: string
}
export interface SetRoomAdminMessage extends BaseWordGameMessage {
  roomId: string;
  playerId: string;
}
export interface UpdateSettingsMessage extends BaseWordGameMessage {
  settings: IWordGameMultiSettings;
}
export interface RemovePlayerMessage extends BaseWordGameMessage {
  playerId: string;
}
export interface TransferGameAdminshipMessage extends BaseWordGameMessage {
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