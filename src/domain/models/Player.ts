import { User, sanitizeUser } from "../P2PRoom";

// TODO : class with a getter 'id'
export interface Player {
  user: User;
  score: number;
}

export function sanitizePlayer(player: Player): Player {
  const result = {
    user: sanitizeUser(player.user),
    score: player.score,
  } as Player;
  return result;
}
