import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { SettingsProvider } from "./contexts/SettingsContext.jsx";
import App from "./App.jsx";
import store from "./store/index.js";
import ThemeProvider from "./contexts/ThemeProvider.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SettingsProvider>
    <Provider store={store}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ThemeProvider>
          <App />
          
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: "rgb(var(--color-background))",
                color: "rgb(var(--color-foreground))",
                border: "1px solid rgb(var(--color-border))",
                borderRadius: "var(--radius)",
              },
            }}
          />
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
    </SettingsProvider>
  </React.StrictMode>
);
