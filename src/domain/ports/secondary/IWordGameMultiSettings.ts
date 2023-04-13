import { WordGameOptions } from 'word-guessing-lib';

// FIXME : are we sure we want to extend this ?
export interface IWordGameMultiSettings extends WordGameOptions  {
  winningScore: number
  timePerGuess: number
}
