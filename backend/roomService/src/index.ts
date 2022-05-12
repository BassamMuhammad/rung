import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { createRoom } from "./createRoom";
import { joinRoom } from "./joinRoom";
import { initializeApp } from "firebase/app";
import axios from "axios";
import cors from "cors";
import { roomInfo } from "./roomInfo";
import { v4 } from "uuid";
import {
  arrayUnion,
  doc,
  getDoc,
  getFirestore,
  setDoc,
  updateDoc,
} from "firebase/firestore";

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
  const getUsernamesFromDb = async (roomId: string): Promise<string[]> => {
    const roomInfo = await getDoc(doc(getFirestore(), "rooms", roomId));
    return roomInfo.get("usernames");
  };
  const emitInRoom = async (
    usernames: string[],
    status: boolean,
    roomId: string
  ) => {
    if (usernames.length === 4) {
      await axios.post("http://localhost:4002/users", {
        usernames,
        roomId,
      });
    }
    socket.emit("in-room", status, usernames, roomId);
  };

  const onRoomEntered = async (
    usernames: string[],
    newUser: string,
    roomId: string
  ) => {
    socket.join(roomId);
    await emitInRoom(usernames, true, roomId);
    socket.to(roomId).emit("entered-room", newUser, roomId);
  };
  socket.on("join-room", async (username: string, roomId: string) => {
    if (!io.sockets.adapter.rooms.get(roomId))
      socket.emit("error", "Room does not exist");
    else if (io.sockets.adapter.rooms.get(roomId)!.size >= 4)
      socket.emit("error", "Room full");
    else {
      try {
        const usernames = await getUsernamesFromDb(roomId);
        if (usernames.includes(username)) {
          socket.emit(
            "error",
            `User name already taken. Taken username list: ${usernames} `
          );
        } else {
          usernames.push(username);
          await updateDoc(doc(getFirestore(), "rooms", roomId), {
            usernames,
          });

          onRoomEntered(usernames, username, roomId);
        }
      } catch (error) {
        socket.emit("error", "Error occured. Try again");
      }
    }
  });
  socket.on("create-room", async (username: string, roomId: string) => {
    try {
      const usernames = [username];
      await setDoc(doc(getFirestore(), "rooms", roomId), {
        roomId,
        usernames,
      });
      onRoomEntered(usernames, username, roomId);
    } catch (error) {
      socket.emit("error", "Error occured. Try again");
    }
  });
  socket.on("check-room", async (roomId: string, username: string) => {
    try {
      const usernames = await getUsernamesFromDb(roomId);
      emitInRoom(usernames, usernames.includes(username), roomId);
    } catch (error) {
      socket.emit("error", "Error occured. Try again");
    }
  });
  socket.on(
    "send-message",
    (roomId: string, username: string, message: string) => {
      socket.to(roomId).emit("receive-message", username, message);
    }
  );
});

const PORT = (process.env.PORT && parseInt(process.env.PORT!)) || 4001;

// app.post("/create-room", createRoom);
// app.post("/join-room", joinRoom);
// app.post("/room-info", roomInfo);

server.listen(PORT, () => {
  console.log(`listenting at ${PORT}`);
});
