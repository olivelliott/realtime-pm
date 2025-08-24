import http from "http";
import { WebSocketServer } from "ws";
import { RealtimeServer } from "../src/core/server.js";

const PORT = Number(process.env.PORT || 3001);

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Realtime PM WebSocket server running\n");
});

const wss = new WebSocketServer({ server });
const realtime = new RealtimeServer();

wss.on("connection", (socket) => {
  realtime.onConnection(socket as any);
});

server.listen(PORT, () => {
  console.log(`[realtime-pm] WS server listening on ws://localhost:${PORT}`);
});
