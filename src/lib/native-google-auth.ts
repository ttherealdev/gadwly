"use client";

import { Capacitor } from "@capacitor/core";
import { ErrorCode, GoogleSignIn } from "@capawesome/capacitor-google-sign-in";

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set — must be the same WEB client ID " +
        "already used in GOOGLE_CLIENT_ID, just exposed to the client build."
    );
  }
  await GoogleSignIn.initialize({ clientId });
  initialized = true;
}

export const isNativeApp = () => Capacitor.isNativePlatform();


export async function nativeGoogleSignIn() {
  await ensureInitialized();
  const result = await GoogleSignIn.signIn();
  return result.idToken;
}

export { ErrorCode as GoogleSignInErrorCode };
