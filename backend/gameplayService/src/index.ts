import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { initializeApp } from "firebase/app";
import cors from "cors";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { onCheck } from "./socketEvents/onCheck";
import { onRung } from "./socketEvents/onRung";
import { onMoveHistory } from "./socketEvents/onMoveHistory";
import { onEnd } from "./socketEvents/onEnd";
import { onDeck } from "./socketEvents/onDeck";
import { onTurn } from "./socketEvents/onTurn";
import { onDeal } from "./socketEvents/onDeal";
import { onDisconnect } from "./socketEvents/onDisconnect";
import { onForceStart } from "./socketEvents/onForceStart";
import { onHistory } from "./socketEvents/onHistory";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_ID,
  appId: process.env.FIREBASE_APP_ID,
};
initializeApp(firebaseConfig);

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: ["http://localhost:3000"] } });
const PORT = (process.env.PORT && parseInt(process.env.PORT!)) || 4002;

io.on("connection", (socket) => {
  socket.on("check", onCheck(io, socket));
  socket.on("rung", onRung(io, socket));
  socket.on("move-history", onMoveHistory(io, socket));
  socket.on("history", onEnd(io));
  socket.on("deck", onDeck(io, socket));
  socket.on("turn", onTurn(socket));
  socket.on("history", onHistory(io));
  socket.on("deal", onDeal(io, socket));
  socket.on("disconnect", onDisconnect(socket));
  socket.on("force-start", onForceStart(io, socket));
});

app.post("/users", async (req, res) => {
  try {
    const { usernames, roomId } = req.body;
    await setDoc(doc(getFirestore(), "rooms", roomId), {
      usernames,
      roomId,
      history: [],
      deal: [],
    });
    res.send("ok");
  } catch (error) {
    res.status(404).send("Error");
    console.log(error);
  }
});

server.listen(PORT, () => {
  `listening at ${PORT}`;
});
