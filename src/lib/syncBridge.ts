let activeUid: string | null = null;

export function getActiveUid(): string | null {
  return activeUid;
}

export function setActiveUid(uid: string | null): void {
  activeUid = uid;
}
