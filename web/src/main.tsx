import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./ui/AuthProvider";
import App from "./ui/App";
import { ErrorBoundary } from "./ui/ErrorPage";
import "./ui/workspace.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
