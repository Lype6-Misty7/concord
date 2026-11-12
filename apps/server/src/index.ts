import "dotenv/config";
import { createServer } from "node:http";
import express from "express";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL ?? "http://localhost:3000",
  },
});

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

io.on("connection", (socket) => {
  console.log(`Socket conectado: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`Socket desconectado: ${socket.id}`);
  });
});

const PORT = Number(process.env.PORT ?? 4000);

httpServer.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
