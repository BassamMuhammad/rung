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
  query,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  updateDoc,
  where,
  collection,
  arrayRemove,
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
  const getUsernamesFromFriendlyRoom = async (
    roomId: string
  ): Promise<string[]> => {
    const room = await getDoc(doc(getFirestore(), "friendlyRooms", roomId));
    return room.get("usernames");
  };
  const getUsernamesInRoom = async (roomId: string) => {
    const sockets = await io.in(roomId).fetchSockets();
    const usernames: string[] = [];
    sockets.forEach((socket) => {
      usernames.push(socket.data["username"]);
    });
    return usernames;
  };
  const onCheck = async (
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
    socket.emit("check-room", status, usernames);
  };

  const onRoomEntered = async (
    usernames: string[],
    newUser: string,
    roomId: string,
    isFriendly: boolean
  ) => {
    socket.join(roomId);
    // await emitInRoom(usernames, true, roomId, isFriendly);
    socket.emit("in-room", newUser, roomId, isFriendly);
    socket.to(roomId).emit("entered-room", usernames, roomId);
  };
  socket.on("disconnect", async () => {
    const username = socket.data["username"];
    const roomId = socket.data["roomId"];
    socket.to(roomId).emit("user-left", username);
    // ["onlineRooms", "friendlyRooms"].forEach(async (val) => {
    //   const q = query(
    //     collection(getFirestore(), val),
    //     where("totalUsers", "<", 4)
    //   );
    //   const rooms = await getDocs(q);
    //   rooms.forEach((onlineRoom) => {
    //     const usernames: string[] = onlineRoom.get("usernames");
    //     const roomId: string = onlineRoom.get("roomId");
    //     const username = usernames.find((username) => {
    //       username === socket.data["username"];
    //     });
    //     if (username) {
    //       updateDoc(doc(getFirestore(), val, roomId), {
    //         usernames: arrayRemove(username),
    //       });
    //     }
    //   });
    // });
  });
  socket.on("online-room", async (username: string) => {
    let usernames: string[];
    let roomId: string;
    const q = query(
      collection(getFirestore(), "onlineRooms"),
      where("totalUsers", "<", 4)
    );
    const rooms = await getDocs(q);
    if (rooms.size > 0) {
      let isRoomJoined = false;
      rooms.forEach(async (room) => {
        usernames = room.get("usernames");
        roomId = room.get("roomId");
        usernames.push(username);
        if (!isRoomJoined) {
          await updateDoc(room.ref, {
            usernames,
            totalUsers: usernames.length + 1,
          });
          isRoomJoined = true;
        }
      });
    } else {
      roomId = v4();
      usernames = [username];
      await setDoc(doc(getFirestore(), "onlineRooms", roomId), {
        usernames,
        totalUsers: 1,
        roomId,
      });
    }
    socket.data = { username };
    onRoomEntered(usernames!, username, roomId!, false);
  });
  socket.on("join-room", async (username: string, roomId: string) => {
    if (!io.sockets.adapter.rooms.get(roomId))
      socket.emit("error", "Room does not exist");
    else if (io.sockets.adapter.rooms.get(roomId)!.size >= 4)
      socket.emit("error", "Room full");
    else {
      try {
        // const usernames = await getUsernamesFromFriendlyRoom(roomId);
        const usernames = await getUsernamesInRoom(roomId);
        if (usernames.includes(username)) {
          socket.emit(
            "error",
            `User name already taken. Taken username list: ${usernames} `
          );
        } else {
          socket.data = { username };
          usernames.push(username);
          // await updateDoc(doc(getFirestore(), "friendlyRooms", roomId), {
          //   usernames,
          //   totalUsers: usernames.length,
          // });

          onRoomEntered(usernames, username, roomId, true);
        }
      } catch (error) {
        socket.emit("error", "Error occured. Try again");
      }
    }
  });
  socket.on("create-room", async (username: string, roomId: string) => {
    try {
      const usernames = [username];
      // await setDoc(doc(getFirestore(), "friendlyRooms", roomId), {
      //   roomId,
      //   usernames,
      //   totalUsers: 1,
      // });
      socket.data = { username };
      onRoomEntered(usernames, username, roomId, true);
    } catch (error) {
      socket.emit("error", "Error occured. Try again");
    }
  });
  socket.on(
    "check-room",
    async (roomId: string, username: string, isFriendly: boolean) => {
      try {
        let usernames: string[];
        usernames = await getUsernamesInRoom(roomId);
        // if (isFriendly) usernames = await getUsernamesFromFriendlyRoom(roomId);
        // else {
        //   const room = await getDoc(doc(getFirestore(), "onlineRooms", roomId));
        //   usernames = room.get("usernames");
        // }
        onCheck(usernames, usernames.includes(username), roomId);
      } catch (error) {
        socket.emit("error", "Error occured. Try again");
      }
    }
  );
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
