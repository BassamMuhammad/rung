import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onMove =
  (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) =>
  (roomId: string, username: string, index: number) => {
    socket.to(roomId).emit("move", username, index);
  };
