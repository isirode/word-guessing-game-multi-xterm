import { IWordGameMessaging } from "../../../../domain/ports/secondary/locale/IWordGameMessaging";
import { WordGameMessageType } from '../../../../domain/models/Message';
import { Player } from "../../../models/Player";
import { IWordGameMultiSettings } from "../../../ports/secondary/IWordGameMultiSettings";

/*
function getPlayerRadical(player: string, isSelf: boolean): string {
  if (isSelf) {
    return 
  }
}
*/

export class WordGameMessagingEN implements IWordGameMessaging {
  formatAdminActionAttempted (playerName: string, roomMessageType: WordGameMessageType): string {
    return `player ${playerName} has attempted to manage the game but is not an admin of the room (${roomMessageType})`
  }

  formatStartingGame (players: Player[]): string {
    return `Starting game (players: ${players.map(x => x.user.name).join(',')})`;
  }

  formatSettings (settings: IWordGameMultiSettings): string {
    return `Configuration is : timer per guess=${settings.timePerGuess}s, winning score=${settings.winningScore}, max attempts=${settings.maxAttempts}, min occurences=${settings.minOccurences}, max occurences=${settings.maxOccurences}`;
  }

  formatPlayerMustGuessLetters (player: string, letters: string, timeToGuess: number, isSelf: boolean): string {
    return (isSelf ? 'You' : 'player ' + player) + ' must guess a word containing ' + letters + ` (${timeToGuess}s remaining)`;
  }

  formatPlayerHasWon (player: string, score: number, isSelf: boolean): string {
    return (isSelf ? 'You have' : 'player ' + player + ' has') + ' won with the score ' + score + ', ending game.'
  }

  formatWrongPlayerHasWon (currentPlayerPlaying: string, winningPlayer: string): string {
    return 'room owner indicate that ' +
      winningPlayer + ' has won but current player is ' +
      currentPlayerPlaying + ' (for you), it might be a desync, ending game'
  }

  formatIncorrectGuess (player: string, word: string, isSelf: boolean): string {
    return (isSelf ? 'You have' : 'player ' + player + ' has') + ` incorrectly guessed : ${word}`
  }

  formatCorrectGuess (player: string, points: number, isSelf: boolean): string {
    return (isSelf ? 'You have' : 'player ' + player + ' has') + ' correctly guessed, points earned : ' + points
  }

  formatTimeToGuessTimedOut (player: string, isSelf: boolean): string {
    return (isSelf ? 'You have' : 'player ' + player + ' has') + ' not guessed in the provided time'
  }

  formatCurrentScore(player: string, score: number, isSelf: boolean) {
    return (isSelf ? 'Your score' : 'The score of the player ' + player) + ` is ${score}`;
  }

  formatWordExample (word: string, letters: string): string {
    return 'word \'' + word + '\' contains letters ' + letters
  }

  formatPeerIsNowConnected (peer: string): string {
    return peer + ' is now connected'
  }

  formatPeerHasDisconnected (peer: string): string {
    return peer + ' has disconnected'
  }

  formatSettingsWereUpdated (player: string): string {
    return player + ' has updated the settings'
  }

  formatPlayerWasRemoved (player: string, isSelf: boolean): string {
    return (isSelf ? 'You were' : 'The player ' + player + " was") + " removed from the game";
  }
}
