import { Server } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onHistory =
  (io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) =>
  async (history: Record<string, string>[], roomId: string) => {
    const sockets = await io.in(roomId).fetchSockets();
    sockets.forEach((sock) => {
      const sockHistory: Record<string, string>[] = sock.data["history"];
      if (
        sockHistory &&
        (sockHistory.length < history.length - 1 ||
          Object.entries(sockHistory[sockHistory.length - 1]).length <
            Object.entries(history[history.length - 1]).length - 1)
      ) {
        sock.emit("move-history", history);
      }
    });
    sockets.forEach((sock) => {
      sock.data["history"] = history;
    });
  };
