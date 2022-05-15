import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onDeal =
  (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) =>
  async (username: string, roomId: string) => {
    const room = await getDoc(doc(getFirestore(), "rooms", roomId));
    const deal = room.get("deal");
    deal.push(username);
    await updateDoc(doc(getFirestore(), "rooms", roomId), {
      deal,
    });
    if (deal.length === 4) {
      socket.emit("start-game", true);
      socket.to(roomId).emit("start-game", true);
    }
  };
