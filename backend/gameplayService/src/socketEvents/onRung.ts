import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onRung =
  (
    io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
  ) =>
  async (rung: string, roomId: string) => {
    try {
      const sockets = await io.in(roomId).fetchSockets();
      sockets.forEach((sock) => {
        sock.data["rung"] = rung;
      });
      socket.to(roomId).emit("rung", rung);
    } catch (error) {
      socket.emit("error", "Error occured. Try again");
    }
  };
