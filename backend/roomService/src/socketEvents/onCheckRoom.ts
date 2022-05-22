import axios from "axios";
import { getDoc, doc, getFirestore } from "firebase/firestore";
import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { getUsernamesInRoom } from "../helpers/getUsernamesInRoom";

export const onCheckRoom =
  (
    io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
  ) =>
  async (roomId: string, username: string, isFriendly: boolean) => {
    try {
      let usernames: string[];
      if (isFriendly) {
        usernames = await getUsernamesInRoom(io, roomId);
      } else {
        const room = await getDoc(doc(getFirestore(), "onlineRooms", roomId));
        usernames = room.get("usernames");
      }
      if (usernames.length === 4) {
        await axios.post("http://localhost:4002/users", {
          usernames,
          roomId,
        });
        console.log("first");
      }
      socket.emit("check-room", usernames.includes(username), usernames);
      if (usernames.length === 4) {
        const sockets = await io.in(roomId).fetchSockets();
        sockets.forEach((sock) => sock.leave(roomId));
      }
    } catch (error) {
      socket.emit("error", "Error occured. Try again");
    }
  };
