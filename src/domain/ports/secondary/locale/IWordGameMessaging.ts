import { WordGameMessageType } from '../../../../../src/domain/models/Message'
import { Player } from '../../../models/Player'
import { IWordGameMultiSettings } from '../IWordGameMultiSettings'
// FIXME : this the recursive path system
// Since the project is using parcel, it might be difficult
// '/' path is C:\
// rootDir and baseUrl would need to be set normally

export interface IWordGameMessaging {
  formatAdminActionAttempted (playerName: string, roomMessageType: WordGameMessageType): string
  formatStartingGame (players: Player[]): string

  formatPlayerHasWon(player: string, score: number, isSelf: boolean): string
  formatWrongPlayerHasWon(currentPlayerPlaying: string, winningPlayer: string): string

  formatPlayerMustGuessLetters (player: string, letters: string, timeToGuess: number, isSelf: boolean): string
  formatIncorrectGuess(playerName: string, word: string, isSelf: boolean): string
  formatCorrectGuess(player: string, points: number, isSelf: boolean): string
  formatTimeToGuessTimedOut(player: string, isSelf: boolean): string
  formatCurrentScore(playerName: string, score: number, isSelf: boolean): string
  formatWordExample(word: string, letters: string): string

  formatPeerIsNowConnected(peer: string): string
  formatPeerHasDisconnected(peer: string): string

  formatSettingsWereUpdated(player: string): string
  formatSettings(settings: IWordGameMultiSettings): string
}