import { IWordGameMessaging } from "../../../../domain/ports/secondary/locale/IWordGameMessaging";
import { WordGameMessageType } from '../../../../domain/models/Message';
import { Player } from "../../../models/Player";
import { IWordGameMultiSettings } from "../../../settings/IWordGameMultiSettings";
import { User } from "peerjs-room";

export class WordGameMessagingEN implements IWordGameMessaging {
  formatAdminActionAttempted (playerName: string, roomMessageType: WordGameMessageType): string {
    return `player ${playerName} has attempted to manage the game but is not an admin of the room (${roomMessageType})`
  }

  // TODO : indicate the timeout here
  formatJoinGameRequested(initializer: User, responseTimeout: number, language: string, players: Player[], isSelf: boolean) {
    let message = `User ${initializer.name} is starting a game (language: ${language}, players: ${players.map(x => x.user.name).join(',')})`;
    if (!isSelf) {
      message += `
      You can join by typing '/join'`
    }
    message += `\r\nThe game will start in ${responseTimeout / 1000} seconds`
    return message;
  }

  formatInitGame (initializer: User, responseTimeout: number, language: string, players: Player[], isSelf: boolean): string {
    let message = `Intializing game (initializer: ${initializer.name}, language: ${language}, players: ${players.map(x => x.user.name).join(',')})`;
    // TODO : log something like 'await response of player.name ?
    message += `\r\nThe game will start in ${responseTimeout / 1000} seconds`
    return message;
  }

  formatStartingGame (language: string, players: Player[]): string {
    return `Starting game (language: ${language}, players: ${players.map(x => x.user.name).join(',')})`;
  }

  formatSettings (settings: IWordGameMultiSettings): string {
    return `Configuration is : timer per guess=${settings.timePerGuess}s, winning score=${settings.winningScore}, max attempts=${settings.maxAttempts}, min occurences=${settings.minOccurences}, max occurences=${settings.maxOccurences}`;
  }

  formatPlayerMustGuessLetters (player: string, letters: string, timeToGuess: number, occurences: number, isSelf: boolean): string {
    return (isSelf ? 'You' : 'player ' + player) + ' must guess a word containing ' + letters + ` (${timeToGuess}s remaining, ${occurences} words contains this sequence)`;
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
