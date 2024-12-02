/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    },
  });

  // In development, load from the dev server
  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:3000");
  } else {
    // In production, load the built Next.js app
    win.loadURL("file://" + path.join(__dirname, "out/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
