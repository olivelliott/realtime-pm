/**
 * Wrapper helpers for WebSocket lifecycle that are neutral to environment
 */

export interface WSLike {
  send(data: string | ArrayBuffer | ArrayBufferView | Blob): void;
  // Browser-style
  addEventListener?: (type: string, listener: (...args: any[]) => void) => void;
  removeEventListener?: (
    type: string,
    listener: (...args: any[]) => void
  ) => void;
  // Node ws-style
  on?: (type: string, listener: (...args: any[]) => void) => void;
  off?: (type: string, listener: (...args: any[]) => void) => void;
  close?: () => void;
  readyState?: number;
}

export function isSocketOpen(ws?: WSLike): boolean {
  if (!ws || ws.readyState == null) return false;
  // 1 is OPEN in both browser and ws client
  return ws.readyState === 1;
}

export function waitForOpen(ws: WSLike): Promise<void> {
  if (isSocketOpen(ws)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onOpen = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("WebSocket error"));
    };
    const cleanup = () => {
      removeSocketListener(ws, "open", onOpen as any);
      removeSocketListener(ws, "error", onError as any);
    };
    addSocketListener(ws, "open", onOpen as any);
    addSocketListener(ws, "error", onError as any);
  });
}

export function addSocketListener(
  ws: WSLike,
  type: "open" | "message" | "error" | "close",
  listener: (...args: any[]) => void
): void {
  if (typeof ws.addEventListener === "function")
    ws.addEventListener(type, listener);
  else if (typeof ws.on === "function") ws.on(type, listener);
}

export function removeSocketListener(
  ws: WSLike,
  type: "open" | "message" | "error" | "close",
  listener: (...args: any[]) => void
): void {
  if (typeof ws.removeEventListener === "function")
    ws.removeEventListener(type, listener);
  else if (typeof ws.off === "function") ws.off(type, listener);
}
