import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { mountProjectControls } from "./project-controls.js";
import { mountModelRuntimeControls } from "./model-runtime-controls.js";
import { mountAgentSwitcher } from "./agent-switcher.js";
import { mountLiveTracePanel } from "./live-trace-panel.js";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

mountProjectControls();
mountModelRuntimeControls();
mountAgentSwitcher();
mountLiveTracePanel();
