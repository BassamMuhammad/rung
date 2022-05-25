import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onMove =
  (
    io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
  ) =>
  async (roomId: string, moveNum: string, index: number, username: string) => {
    const sockets = await io.in(roomId).fetchSockets();
    sockets.forEach((sock) => {
      sock.data["moveNum"] = moveNum;
    });
    socket.to(roomId).emit("move", index, username);
  };
