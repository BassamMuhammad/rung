import { doc, getFirestore, updateDoc } from "firebase/firestore";
import { Server } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onEnd =
  (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) =>
  async (
    rung: string,
    winners: string[],
    history: Record<string, string>[],
    roomId: string
  ) => {
    try {
      const sockets = await io.in(roomId).fetchSockets();
      if (sockets[0].data["end"]) return;
      await updateDoc(doc(getFirestore(), "rooms", roomId), {
        history,
        winners,
        rung,
        completed: true,
      });
      sockets.forEach((socket) => {
        socket.data["end"] = true;
        socket.disconnect();
      });
    } catch (error) {}
  };
