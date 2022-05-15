import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { onCreateRoom } from "./socketEvents/onCreateRoom";
import { onJoinRoom } from "./socketEvents/onJoinRoom";
import { initializeApp } from "firebase/app";
import { onDisconnect } from "./socketEvents/onDisconnect";
import { onOnlineRoom } from "./socketEvents/onOnlineRoom";
import { onCheckRoom } from "./socketEvents/onCheckRoom";
import { onSendMessage } from "./socketEvents/onSendMessage";

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ["http://localhost:3000"] } });

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_ID,
  appId: process.env.FIREBASE_APP_ID,
};

initializeApp(firebaseConfig);

io.on("connection", (socket) => {
  socket.on("disconnect", onDisconnect(socket));
  socket.on("online-room", onOnlineRoom(socket));
  socket.on("join-room", onJoinRoom(io, socket));
  socket.on("create-room", onCreateRoom(socket));
  socket.on("check-room", onCheckRoom(io, socket));
  socket.on("send-message", onSendMessage(socket));
});

const PORT = (process.env.PORT && parseInt(process.env.PORT!)) || 4001;

server.listen(PORT, () => {
  console.log(`listenting at ${PORT}`);
});
