import { createHash } from "crypto";

export function hashPacketPasscode(passcode: string) {
  return createHash("sha256").update(passcode.trim(), "utf8").digest("hex");
}

export function verifyPacketPasscode(passcode: string | undefined | null, passcodeHash: string | null | undefined) {
  if (!passcodeHash) {
    return true;
  }

  if (!passcode?.trim()) {
    return false;
  }

  return hashPacketPasscode(passcode) === passcodeHash;
}

export function isPacketExpired(expiresAt: string | null | undefined) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}
