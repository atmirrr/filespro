import type { ConnectionConfig, ListResult, RemoteEntry } from "./types";

export interface IpcApi {
  connections: {
    list(): Promise<ConnectionConfig[]>;
    save(config: ConnectionConfig): Promise<ConnectionConfig>;
    delete(id: string): Promise<void>;
    test(config: ConnectionConfig): Promise<{ ok: boolean; error?: string }>;
  };
  fs: {
    list(connectionId: string, prefix: string, cursor?: string): Promise<ListResult>;
    head(connectionId: string, key: string): Promise<RemoteEntry | null>;
    download(connectionId: string, key: string, destPath: string): Promise<{ bytes: number }>;
    uploadLocalFile(
      connectionId: string,
      destKey: string,
      sourcePath: string,
    ): Promise<{ bytes: number }>;
    delete(connectionId: string, key: string): Promise<void>;
    copy(
      sourceConnectionId: string,
      sourceKey: string,
      destConnectionId: string,
      destKey: string,
    ): Promise<{ bytes: number }>;
    move(
      sourceConnectionId: string,
      sourceKey: string,
      destConnectionId: string,
      destKey: string,
    ): Promise<{ bytes: number }>;
    mkdir(connectionId: string, key: string): Promise<void>;
    url(
      connectionId: string,
      key: string,
      opts?: { expiresIn?: number },
    ): Promise<string | null>;
    revealInFinder(path: string): Promise<void>;
    thumbUrl(connectionId: string, key: string): Promise<string | null>;
    readTextPreview(connectionId: string, key: string, maxBytes?: number): Promise<string>;
  };
  dialog: {
    pickFiles(): Promise<string[]>;
    pickDirectory(): Promise<string | null>;
    saveAs(suggestedName: string): Promise<string | null>;
  };
  shell: {
    openExternal(url: string): Promise<void>;
  };
  app: {
    platform(): Promise<NodeJS.Platform>;
    version(): Promise<string>;
    systemPaths(): Promise<{ home: string; desktop: string; documents: string; downloads: string }>;
  };
}

declare global {
  interface Window {
    api: IpcApi;
  }
}
