import { IRoom, P2PRoom, User } from "peerjs-room";
import { Logger } from "word-guessing-game-common";
import { WordGame, GuessResult } from "word-guessing-lib";
import { WordGameMessageType } from "../models/Message";
import { Player } from "../models/Player";
import { IWordGameMultiSettings } from "../settings/IWordGameMultiSettings";
import { formatPeerName, formatRoomName } from "./CommonLogging";
import { WordGameMessagingEN } from "../adapters/secondary/locale/WordGameMessagingEN";

// FIXME : move it to a adapter directory, move the interface to a port directory
export class WordGameEventsLogger {

  logger: Logger;
  user: User;
  p2pRoom: P2PRoom;
  wordGameMessagingEN: WordGameMessagingEN;

  get room(): IRoom {
    return this.p2pRoom.room;
  }

  constructor(logger: Logger, user: User, p2pRoom: P2PRoom, wordGameMessagingEN: WordGameMessagingEN) {
    this.logger = logger;
    this.user = user;
    this.p2pRoom = p2pRoom;
    this.wordGameMessagingEN = wordGameMessagingEN;
  }

  isSelf(player: Player) {
    return player.user.peer.id === this.user.peer.id;
  }

  isSelfUser(user: User) {
    return user.peer.id === this.user.peer.id;
  }

  onJoinGameRequested(initializer: User, responseTimeout: number, settings: IWordGameMultiSettings, players: Player[], admin: User): void {
    this.logger.writeLn(`${this.getFormattedAdministration()}${this.wordGameMessagingEN.formatJoinGameRequested(initializer, responseTimeout, WordGame.getFullLanguage(settings.language), players, this.isSelfUser(initializer))}`);
    this.logger.writeLn(`${this.wordGameMessagingEN.formatSettings(settings)}`);
  }

  onInitGame (initializer: User, responseTimeout: number, settings: IWordGameMultiSettings, players: Player[], admin: User): void {
    this.logger.writeLn(`${this.getFormattedAdministration()}${this.wordGameMessagingEN.formatInitGame(initializer, responseTimeout, WordGame.getFullLanguage(settings.language), players, this.isSelfUser(initializer))}`);
    this.logger.writeLn(`${this.wordGameMessagingEN.formatSettings(settings)}`);
  }

  onStartingGame (initializer: User, settings: IWordGameMultiSettings, players: Player[], admin: User): void {
    this.logger.writeLn(`${this.getFormattedAdministration()}${this.wordGameMessagingEN.formatStartingGame(WordGame.getFullLanguage(settings.language), players)}`);
    this.logger.writeLn(`${this.wordGameMessagingEN.formatSettings(settings)}`);
  }

  onPlayerWon (winner: Player, from: Player, admin: Player): void {
    this.logger.writeLn(`${this.getFormattedAdministration()}${this.wordGameMessagingEN.formatPlayerHasWon(winner.user.name, winner.score, this.isSelf(winner))}`);
  }

  onAdminActionAttempted (player: Player, messageType: WordGameMessageType, admin: Player): void {
    this.logger.writeLn(`${this.getFormattedAdministration()}${this.wordGameMessagingEN.formatAdminActionAttempted(player.user.name, messageType)}`);
  }

  onSequenceToGuess (player: Player, sequence: string, timeToGuess: number, occurences: number, admin: Player): void {
    this.logger.writeLn(`${this.getFormattedAdministration()}${this.wordGameMessagingEN.formatPlayerMustGuessLetters(player.user.name, sequence, timeToGuess, occurences, this.isSelf(player))}`);
  }

  onGuessAttempt(playerGuessing: Player, word: string, sequence: string, admin: Player) {
    this.logger.writeLn(`${this.getFormattedAdministration()}${word}`);
  }

  onIncorrectGuess (playerGuessing: Player, word: string, sequence: string, reason: GuessResult, admin: Player): void {
    this.logger.writeLn(`${this.getFormattedAdministration()}${this.wordGameMessagingEN.formatIncorrectGuess(playerGuessing.user.name, word, this.isSelf(playerGuessing))}`);
  }

  onCorrectGuess (playerGuessing: Player, word: string, sequence: string, scoreAdded: number, reason: GuessResult, admin: Player): void {
    this.logger.writeLn(`${this.getFormattedAdministration()}${this.wordGameMessagingEN.formatCorrectGuess(playerGuessing.user.name, scoreAdded, this.isSelf(playerGuessing))}`);
    this.logger.writeLn(`${this.getFormattedAdministration()}${this.wordGameMessagingEN.formatCurrentScore(playerGuessing.user.name, playerGuessing.score, this.isSelf(playerGuessing))}`);
  }

  onGuessTimeout (player: Player, admin: Player): void {
    this.logger.writeLn(`${this.getFormattedAdministration()}${this.wordGameMessagingEN.formatTimeToGuessTimedOut(player.user.name, this.isSelf(player))}`);
  }

  onWordExample (example: string, sequence: string, admin: Player): void {
    this.logger.writeLn(`${this.getFormattedAdministration()}${this.wordGameMessagingEN.formatWordExample(example, sequence)}`);
  }

  onSettingsUpdated (newSettings: IWordGameMultiSettings, formerSettings: IWordGameMultiSettings, player: Player, admin: Player): void {
    this.logger.writeLn(`${this.getFormattedAdministration()}${this.wordGameMessagingEN.formatSettingsWereUpdated(player.user.name)}`);
    this.logger.writeLn(`${this.wordGameMessagingEN.formatSettings(newSettings)}`);
  }

  onPlayerRemoved(player: Player, from: Player, admin: Player | undefined) {
    if (admin !== undefined) {
      this.logger.writeLn(`${this.getFormattedAdministration()}${this.wordGameMessagingEN.formatPlayerWasRemoved(player.user.name, this.isSelf(player))}`);
    } else {
      this.logger.writeLn(`${this.getFormattedAdministration()}${this.wordGameMessagingEN.formatPlayerWasRemoved(player.user.name, this.isSelf(player))}`);
    }
  }

  getFormattedAdministration() {
    return `(${formatRoomName(this.room.roomName)}:administration) : `
  }
  
}