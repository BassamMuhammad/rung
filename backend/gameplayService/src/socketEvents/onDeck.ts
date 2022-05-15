import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onDeck =
  (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) =>
  (deck: [], roomId: string) => {
    socket.to(roomId).emit("deck", deck);
  };
