import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onDeal =
  (
    io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
  ) =>
  async (username: string, roomId: string) => {
    socket.data["deal"] = true;
    let numOfDeal = 0;
    const sockets = await io.in(roomId).fetchSockets();
    sockets.forEach((sock) => {
      if (sock.data["deal"]) numOfDeal++;
    });
    if (numOfDeal >= 4) {
      const sockets = await io.in(roomId).fetchSockets();
      sockets.forEach((sock) => (sock.data["start"] = true));
      socket.emit("start-game", true);
      socket.to(roomId).emit("start-game", true);
    }
  };
