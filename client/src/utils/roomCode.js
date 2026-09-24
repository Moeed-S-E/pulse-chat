export function generateRoomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `PULSE-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`;
}
