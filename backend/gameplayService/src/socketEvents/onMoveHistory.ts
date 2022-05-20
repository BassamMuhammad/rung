import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onMoveHistory =
  (
    io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
  ) =>
  async (roomId: string, history: Record<string, string>[]) => {
    const sockets = await io.in(roomId).fetchSockets();
    let largerHistory = history;
    let isMyHistoryLarger = true;
    sockets.forEach((sock) => {
      const sockHistory: Record<string, string>[] = sock.data["history"];
      if (
        sockHistory &&
        (sockHistory.length > largerHistory.length ||
          Object.entries(sockHistory[sockHistory.length - 1]).length >
            Object.entries(largerHistory[largerHistory.length - 1]).length)
      ) {
        largerHistory = sockHistory;
        isMyHistoryLarger = false;
      }
    });
    if (isMyHistoryLarger) socket.to(roomId).emit("move-history", history);
    else socket.emit("move-history", history);
  };
