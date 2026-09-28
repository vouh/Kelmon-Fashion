"use client";

import { createContext, useContext } from "react";

/**
 * Firebase is optional for now. Wire up real client SDK later when env is ready.
 * Until then, consumers get an unconfigured stub and the app runs without Firebase.
 */
interface FirebaseContextValue {
  configured: boolean;
}

const FirebaseContext = createContext<FirebaseContextValue>({ configured: false });

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseContext.Provider value={{ configured: false }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  return useContext(FirebaseContext);
}
