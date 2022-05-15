import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { initializeApp } from "firebase/app";
import cors from "cors";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { onCheck } from "./socketEvents/onCheck";
import { onRung } from "./socketEvents/onRung";
import { onMove } from "./socketEvents/onMove";
import { onHistory } from "./socketEvents/onHistory";
import { onDeck } from "./socketEvents/onDeck";
import { onTurn } from "./socketEvents/onTurn";
import { onDeal } from "./socketEvents/onDeal";

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
  socket.on("rung", onRung(socket));
  socket.on("move", onMove(socket));
  socket.on("history", onHistory(socket));
  socket.on("deck", onDeck(socket));
  socket.on("turn", onTurn(socket));
  socket.on("deal", onDeal);
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
