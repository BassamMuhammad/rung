import { doc, getFirestore, FirestoreError, getDoc } from "firebase/firestore";
import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const roomInfo =
  (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) =>
  async (roomId: string, isFriendly: string) => {
    try {
      const roomInfo = await getDoc(
        doc(
          getFirestore(),
          isFriendly ? "friendlyRooms" : "onlineRooms",
          roomId
        )
      );
      console.log(roomInfo.data());
      socket.broadcast.emit("room-info", {
        data: { roomInfo: roomInfo.data() },
      });
    } catch (e) {
      const err = e as FirestoreError;
      socket.broadcast.emit("room-info", {
        error: err,
      });
    }
  };
