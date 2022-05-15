import { doc, getFirestore, updateDoc } from "firebase/firestore";
import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onRung =
  (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) =>
  async (rung: string, roomId: string) => {
    try {
      await updateDoc(doc(getFirestore(), "rooms", roomId), { rung });
      socket.to(roomId).emit("rung", rung);
    } catch (error) {
      socket.emit("error", "Error occured. Try again");
    }
  };
