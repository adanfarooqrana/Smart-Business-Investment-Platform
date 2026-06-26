import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { onAuthStateChanged } from "firebase/auth";
import { ref, update } from "firebase/database";
import { getRouter } from "./router";
import { database, auth } from "./firebase";
import { syncPlatformStatsToRtdb } from "./services/platformStatsService";
import { repairAppState } from "./hooks/useAppState";
import "./styles.css";
import "./services/firebaseService";

const router = getRouter();

function App() {
  useEffect(() => {
    repairAppState();
    void syncPlatformStatsToRtdb();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const lastSeen = Date.now();
        Promise.all([
          update(ref(database, `users/${user.uid}`), { lastSeen }),
          update(ref(database, `user_directory/${user.uid}`), { lastSeen }),
        ])
          .then(() => {
            console.log("✅ Firebase Auth + RTDB connected");
            return syncPlatformStatsToRtdb();
          })
          .catch((err) => console.error("❌ Firebase RTDB write failed:", err.message));
      } else {
        console.log("ℹ️ Guest mode — graphs read from platform_stats + public paths");
      }
    });

    return () => unsubscribe();
  }, []);

  return <RouterProvider router={router} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
