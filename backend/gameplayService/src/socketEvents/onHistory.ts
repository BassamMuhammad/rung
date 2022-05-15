import { doc, getFirestore, updateDoc } from "firebase/firestore";
import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onHistory =
  (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) =>
  async (history: Record<string, string>[], roomId: string) => {
    try {
      await updateDoc(doc(getFirestore(), "rooms", roomId), {
        history,
      });
    } catch (error) {
      socket.emit("error", "Error occured. Try again");
    }
  };
