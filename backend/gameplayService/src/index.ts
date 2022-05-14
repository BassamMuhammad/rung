import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { initializeApp } from "firebase/app";
import cors from "cors";
import {
  arrayUnion,
  doc,
  getDoc,
  getFirestore,
  setDoc,
  updateDoc,
} from "firebase/firestore";

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
  socket.on("check", async (username: string, roomId: string) => {
    try {
      const roomInfo = await getDoc(doc(getFirestore(), "rooms", roomId));
      const usernames: string[] = roomInfo.get("usernames");
      const index = usernames.findIndex((uName) => uName === username);
      if (index >= 0) {
        socket.join(roomId);
        socket.emit("allowed", usernames[index]);
        if (io.sockets.adapter.rooms.get(roomId)!.size === 4) {
          socket.emit("positions", usernames);
          socket.to(roomId).emit("positions", usernames);
        }
      } else {
        socket.emit("not-allowed", "No record exist of user");
      }
    } catch (error) {
      socket.emit("error", "Error occured. Try again");
    }
  });
  socket.on("rung", async (rung: string, roomId: string) => {
    try {
      await updateDoc(doc(getFirestore(), "rooms", roomId), { rung });
      socket.to(roomId).emit("rung", rung);
    } catch (error) {
      socket.emit("error", "Error occured. Try again");
    }
  });
  socket.on("move", (roomId: string, username: string, index: number) => {
    socket.to(roomId).emit("move", username, index);
  });
  socket.on(
    "trick",
    async (history: Record<string, string>[], roomId: string) => {
      try {
        await updateDoc(doc(getFirestore(), "rooms", roomId), {
          history: history,
        });
      } catch (error) {
        socket.emit("error", "Error occured. Try again");
      }
    }
  );
  socket.on("deck", (deck: [], roomId: string) => {
    socket.to(roomId).emit("deck", deck);
  });
  socket.on("turn", (username: string, roomId: string) => {
    socket.to(roomId).emit("turn", username);
  });
});

app.post("/users", async (req, res) => {
  const { usernames, roomId } = req.body;

  await setDoc(doc(getFirestore(), "rooms", roomId), {
    usernames,
    roomId,
    history: [],
  });
  console.log("users");
  res.send("ok");
});

server.listen(PORT, () => {
  `listening at ${PORT}`;
});