import { User } from 'peerjs-room';
import { WordGameMessageType } from '../../../../../src/domain/models/Message'
import { Player } from '../../../models/Player'
import { IWordGameMultiSettings } from '../../../settings/IWordGameMultiSettings'
// FIXME : this the recursive path system
// Since the project is using parcel, it might be difficult
// '/' path is C:\
// rootDir and baseUrl would need to be set normally

export interface IWordGameMessaging {
  formatAdminActionAttempted (playerName: string, roomMessageType: WordGameMessageType): string;

  formatJoinGameRequested(initializer: User, responseTimeout: number, language: string, players: Player[], isSelf: boolean): string;
  formatInitGame (initializer: User, responseTimeout: number, language: string, players: Player[], isSelf: boolean): string;
  formatStartingGame (language: string, players: Player[]): string;

  formatPlayerHasWon(player: string, score: number, isSelf: boolean): string;
  formatWrongPlayerHasWon(currentPlayerPlaying: string, winningPlayer: string): string;

  formatPlayerMustGuessLetters (player: string, letters: string, timeToGuess: number, occurences: number, isSelf: boolean): string;
  formatIncorrectGuess(playerName: string, word: string, isSelf: boolean): string;
  formatCorrectGuess(player: string, points: number, isSelf: boolean): string;
  formatTimeToGuessTimedOut(player: string, isSelf: boolean): string;
  formatCurrentScore(playerName: string, score: number, isSelf: boolean): string;
  formatWordExample(word: string, letters: string): string;

  formatPeerIsNowConnected(peer: string): string;
  formatPeerHasDisconnected(peer: string): string;

  formatSettingsWereUpdated(player: string): string;
  formatSettings(settings: IWordGameMultiSettings): string;

  formatPlayerWasRemoved (player: string, isSelf: boolean): string;
}