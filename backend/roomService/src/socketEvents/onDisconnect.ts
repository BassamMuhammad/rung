import {
  getFirestore,
  query,
  collection,
  getDocs,
  arrayRemove,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onDisconnect =
  (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) =>
  async () => {
    friendlyUserLeft(socket);
    onlineUserLeft(socket);
  };

const friendlyUserLeft = (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  const username = socket.data["username"];
  const roomId = socket.data["roomId"];
  socket.to(roomId).emit("user-left", username);
};
const onlineUserLeft = async (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  const q = query(
    collection(getFirestore(), "onlineRooms"),
    where("totalUsers", "<", 4)
  );
  const rooms = await getDocs(q);
  rooms.forEach(async (onlineRoom) => {
    const usernames: string[] = onlineRoom.get("usernames");
    const roomId: string = onlineRoom.get("roomId");
    const username = usernames.find((username) => {
      username === socket.data["username"];
    });
    if (username) {
      socket.to(roomId).emit("user-left", username);
      await updateDoc(doc(getFirestore(), "onlineRooms", roomId), {
        usernames: arrayRemove(username),
      });
    }
  });
};
