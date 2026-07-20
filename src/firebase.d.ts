import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Database } from "firebase/database";
import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";

export const auth: Auth;
export const db: Database;
export const database: Database;
export const firestore: Firestore;
export const storage: FirebaseStorage;

export const writeData: (path: string, data: unknown) => Promise<void>;
export const pushData: (path: string, data: unknown) => Promise<string | null>;
export const readData: (path: string) => Promise<unknown>;
export const updateData: (path: string, data: object) => Promise<void>;
export const deleteData: (path: string) => Promise<void>;
export const listenData: (
  path: string,
  callback: (value: unknown) => void,
) => () => void;

declare const app: FirebaseApp;
export default app;
