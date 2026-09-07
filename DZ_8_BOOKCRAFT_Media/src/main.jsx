import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { mountAuthorProjectHub } from "./author-project-hub.js";
import { mountModelRuntimeControls } from "./model-runtime-controls.js";
import { mountAgentSwitcher } from "./agent-switcher.js";
import { mountLiveTracePanel } from "./live-trace-panel.js";
import { mountUiActionTrace } from "./ui-action-trace.js";
import { mountUiActionFeed } from "./ui-action-feed.js";
import { prepareProjectHubStartup, mountProjectHubNavigationGuard } from "./startup-project-guard.js";
import { mountNeutralStartScreen } from "./neutral-start-screen.js";
import "./styles.css";

prepareProjectHubStartup();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

mountProjectHubNavigationGuard();
mountAuthorProjectHub();
mountNeutralStartScreen();
mountModelRuntimeControls();
mountAgentSwitcher();
mountLiveTracePanel();
mountUiActionTrace();
mountUiActionFeed();
