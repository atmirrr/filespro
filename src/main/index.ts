import { app, BrowserWindow, ipcMain, dialog, shell, nativeTheme, Menu } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  listConnections,
  saveConnection,
  deleteConnection,
} from "./store.js";
import { invalidateClient } from "./adapters.js";
import {
  list,
  head,
  downloadToFile,
  uploadLocalFile,
  deleteEntry,
  copy,
  move,
  mkdir,
  url as getUrl,
  testConnection,
  thumbUrl,
  readTextPreview,
  capabilities,
  downloadZipFolder,
} from "./fileops.js";
import type { ConnectionConfig } from "../shared/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const windows = new Set<BrowserWindow>();

function createWindow() {
  const iconPath = path.join(__dirname, "../../build/icon.icns");
  if (process.platform === "darwin") {
    try {
      app.dock?.setIcon(iconPath);
    } catch {
      /* dev mode without bundled icon — ignore */
    }
  }

  // Cascade new windows so they don't stack
  const offset = windows.size * 28;
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 880,
    minHeight: 560,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 14, y: 18 },
    backgroundColor: "#FFFFFF",
    vibrancy: "sidebar",
    visualEffectState: "active",
    icon: iconPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Apply offset to subsequent windows so they cascade visually
  if (offset > 0) {
    const [x, y] = win.getPosition();
    win.setPosition(x + offset, y + offset);
  }

  win.once("ready-to-show", () => win.show());

  const devServer = process.env["ELECTRON_RENDERER_URL"];
  if (devServer) {
    void win.loadURL(devServer);
    if (windows.size === 0) win.webContents.openDevTools({ mode: "detach" });
  } else {
    void win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  windows.add(win);
  win.on("closed", () => {
    windows.delete(win);
  });
  return win;
}

function buildMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "File",
      submenu: [
        {
          label: "New Window",
          accelerator: "CmdOrCtrl+N",
          click: () => createWindow(),
        },
        { type: "separator" },
        { role: "close" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "zoom" }, { role: "front" }],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function wrap<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((err: unknown) => {
    const message = (err as Error)?.message ?? String(err);
    throw new Error(message);
  });
}

function registerIpc() {
  ipcMain.handle("connections:list", () => wrap(() => listConnections()));
  ipcMain.handle("connections:save", (_e, config: ConnectionConfig) => {
    invalidateClient(config.id);
    return wrap(() => saveConnection(config));
  });
  ipcMain.handle("connections:delete", (_e, id: string) => {
    invalidateClient(id);
    return wrap(() => deleteConnection(id));
  });
  ipcMain.handle("connections:test", (_e, config: ConnectionConfig) =>
    wrap(() => testConnection(config)),
  );

  ipcMain.handle("fs:list", (_e, id: string, prefix: string, cursor?: string) =>
    wrap(() => list(id, prefix, cursor)),
  );
  ipcMain.handle("fs:head", (_e, id: string, key: string) => wrap(() => head(id, key)));
  ipcMain.handle("fs:download", (_e, id: string, key: string, destPath: string) =>
    wrap(() => downloadToFile(id, key, destPath)),
  );
  ipcMain.handle("fs:upload", (_e, id: string, destKey: string, sourcePath: string) =>
    wrap(() => uploadLocalFile(id, destKey, sourcePath)),
  );
  ipcMain.handle("fs:delete", (_e, id: string, key: string) => wrap(() => deleteEntry(id, key)));
  ipcMain.handle(
    "fs:copy",
    (_e, srcId: string, srcKey: string, dstId: string, dstKey: string) =>
      wrap(() => copy(srcId, srcKey, dstId, dstKey)),
  );
  ipcMain.handle(
    "fs:move",
    (_e, srcId: string, srcKey: string, dstId: string, dstKey: string) =>
      wrap(() => move(srcId, srcKey, dstId, dstKey)),
  );
  ipcMain.handle("fs:mkdir", (_e, id: string, key: string) => wrap(() => mkdir(id, key)));
  ipcMain.handle("fs:url", (_e, id: string, key: string, opts?: { expiresIn?: number }) =>
    wrap(() => getUrl(id, key, opts)),
  );
  ipcMain.handle("fs:reveal", (_e, p: string) =>
    wrap(async () => {
      shell.showItemInFolder(p);
    }),
  );
  ipcMain.handle("fs:thumbUrl", (_e, id: string, key: string) => wrap(() => thumbUrl(id, key)));
  ipcMain.handle("fs:readTextPreview", (_e, id: string, key: string, maxBytes?: number) =>
    wrap(() => readTextPreview(id, key, maxBytes)),
  );
  ipcMain.handle("fs:capabilities", (_e, id: string) => wrap(() => capabilities(id)));
  ipcMain.handle("fs:downloadZip", (_e, id: string, prefix: string, destPath: string) =>
    wrap(() => downloadZipFolder(id, prefix, destPath)),
  );

  ipcMain.handle("dialog:pickFiles", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
    });
    return result.canceled ? [] : result.filePaths;
  });
  ipcMain.handle("dialog:pickDirectory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
    });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });
  ipcMain.handle("dialog:saveAs", async (_e, suggestedName: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: suggestedName,
    });
    return result.canceled ? null : result.filePath ?? null;
  });

  ipcMain.handle("shell:openExternal", (_e, url: string) => wrap(() => shell.openExternal(url)));
  ipcMain.handle("app:platform", () => process.platform);
  ipcMain.handle("app:version", () => app.getVersion());
  ipcMain.handle("app:systemPaths", () => ({
    home: app.getPath("home"),
    desktop: app.getPath("desktop"),
    documents: app.getPath("documents"),
    downloads: app.getPath("downloads"),
  }));
}

void app.whenReady().then(() => {
  nativeTheme.themeSource = "light";
  registerIpc();
  buildMenu();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
