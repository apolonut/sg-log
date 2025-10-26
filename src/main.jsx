import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app/App.jsx";
import "@/styles/index.css";
import { ensureAuth } from "@/firebase.js";

ensureAuth().then(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}).catch(err => {
  console.error("Firebase auth failed:", err);
  // По желание: покажи fallback UI/съобщение
});
