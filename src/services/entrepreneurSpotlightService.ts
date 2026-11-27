import { onValue, ref, set } from "firebase/database";
import { doc, getDoc } from "firebase/firestore";
import { database, firestore } from "../firebase";

export async function startEntrepreneurSpotlightSync(uid: string) {
  const moduleUrl = "/entrepreneur-sync.js";
  const { watchEntrepreneurProfile } = await import(/* @vite-ignore */ moduleUrl);
  return watchEntrepreneurProfile({
    uid,
    listen: (path: string, callback: (value: unknown) => void) => onValue(ref(database, path), snapshot => callback(snapshot.val()), error => console.warn("Entrepreneur activity read:", error.message)),
    readRegistration: async () => (await getDoc(doc(firestore, "users", uid))).data() || {},
    publish: (profile: unknown) => set(ref(database, `entrepreneur_spotlights/${uid}`), profile),
  });
}
