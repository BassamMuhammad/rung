import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onDeck =
  (
    io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
  ) =>
  async (deck: [], roomId: string) => {
    const sockets = await io.in(roomId).fetchSockets();
    sockets.forEach((sock) => {
      sock.data["deck"] = deck;
    });
    socket.to(roomId).emit("deck", deck);
  };
