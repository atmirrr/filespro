import { contextBridge, ipcRenderer } from "electron";

const api = {
  connections: {
    list: () => ipcRenderer.invoke("connections:list"),
    save: (config: unknown) => ipcRenderer.invoke("connections:save", config),
    delete: (id: string) => ipcRenderer.invoke("connections:delete", id),
    test: (config: unknown) => ipcRenderer.invoke("connections:test", config),
  },
  fs: {
    list: (id: string, prefix: string, cursor?: string) =>
      ipcRenderer.invoke("fs:list", id, prefix, cursor),
    head: (id: string, key: string) => ipcRenderer.invoke("fs:head", id, key),
    download: (id: string, key: string, destPath: string) =>
      ipcRenderer.invoke("fs:download", id, key, destPath),
    uploadLocalFile: (id: string, destKey: string, sourcePath: string) =>
      ipcRenderer.invoke("fs:upload", id, destKey, sourcePath),
    delete: (id: string, key: string) => ipcRenderer.invoke("fs:delete", id, key),
    copy: (srcId: string, srcKey: string, dstId: string, dstKey: string) =>
      ipcRenderer.invoke("fs:copy", srcId, srcKey, dstId, dstKey),
    move: (srcId: string, srcKey: string, dstId: string, dstKey: string) =>
      ipcRenderer.invoke("fs:move", srcId, srcKey, dstId, dstKey),
    mkdir: (id: string, key: string) => ipcRenderer.invoke("fs:mkdir", id, key),
    url: (id: string, key: string, opts?: { expiresIn?: number }) =>
      ipcRenderer.invoke("fs:url", id, key, opts),
    revealInFinder: (p: string) => ipcRenderer.invoke("fs:reveal", p),
    thumbUrl: (id: string, key: string) => ipcRenderer.invoke("fs:thumbUrl", id, key),
    readTextPreview: (id: string, key: string, maxBytes?: number) =>
      ipcRenderer.invoke("fs:readTextPreview", id, key, maxBytes),
  },
  dialog: {
    pickFiles: () => ipcRenderer.invoke("dialog:pickFiles"),
    pickDirectory: () => ipcRenderer.invoke("dialog:pickDirectory"),
    saveAs: (suggestedName: string) => ipcRenderer.invoke("dialog:saveAs", suggestedName),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  },
  app: {
    platform: () => ipcRenderer.invoke("app:platform"),
    version: () => ipcRenderer.invoke("app:version"),
    systemPaths: () => ipcRenderer.invoke("app:systemPaths"),
  },
};

try {
  contextBridge.exposeInMainWorld("api", api);
} catch (e) {
  console.error("Failed to expose preload API", e);
}
