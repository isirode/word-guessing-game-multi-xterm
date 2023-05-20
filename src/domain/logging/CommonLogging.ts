// TODO : put it in a lib
export const resetSequence = '\x1b[0m';

export const blueFont = '\x1B[34m';
export const orangeFont = '\x1B[196m';
export const redFont = '\x1B[202m';
export const greenFont = '\x1B[2m';// FIXME : should be green but is not
export const green2Font = '\x1B[34m';// FIXME : should be green but is not
export const greyFont = '\x1B[8m';
export const yellowFont = '\x1B[226m';

// TODO : allow to select it
export function formatPeerName(peer: string) {
  return blueFont + peer + resetSequence;
}

export function formatRoomName(room: string) {
  return green2Font + room + resetSequence;
}

export function formatPeerId(peerId: string) {
  return yellowFont + peerId + resetSequence;
}

export function formatError(text: string) {
  return redFont + text + resetSequence;
}

export function getFormattedRoomPrefix(roomName: string, userName: string, userId: string): string {
  let value = '';
  value += '(' + formatRoomName(roomName);
  value += ':' + formatPeerName(userName) + ':' + formatPeerId(userId);
  value += ') : ';
  return value;
}
