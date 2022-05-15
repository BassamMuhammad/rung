import { doc, getDoc, getFirestore } from "firebase/firestore";
import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onCheck =
  (
    io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
  ) =>
  async (username: string, roomId: string) => {
    try {
      const room = await getDoc(doc(getFirestore(), "rooms", roomId));
      const usernames: string[] = room.get("usernames");
      if (usernames.includes(username)) {
        socket.join(roomId);
        socket.emit("allowed", username);
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
  };
