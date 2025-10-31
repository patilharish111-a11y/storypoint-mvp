import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server as SocketIOServer } from "socket.io";
import { initRoutes } from "./routes";
import { initSocket } from "./socket";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173" }
});

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

initRoutes(app, prisma);
initSocket(io, prisma);

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
