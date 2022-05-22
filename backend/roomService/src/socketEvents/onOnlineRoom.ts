import {
  query,
  collection,
  getFirestore,
  getDocs,
  updateDoc,
  setDoc,
  where,
  doc,
} from "firebase/firestore";
import { v4 } from "uuid";
import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { onRoomEntered } from "../helpers/onRoomEntered";

export const onOnlineRoom =
  (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) =>
  async (username: string) => {
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
        if (!isRoomJoined) {
          usernames = room.get("usernames");
          roomId = room.get("roomId");
          usernames.push(username);
          await updateDoc(room.ref, {
            usernames,
            totalUsers: usernames.length,
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
    socket.data["username"] = username;
    onRoomEntered(socket, usernames!, username, roomId!, false);
  };
