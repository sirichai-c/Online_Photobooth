const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createRoomCode() {
  const length = Math.floor(Math.random() * 3) + 4;

  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}
