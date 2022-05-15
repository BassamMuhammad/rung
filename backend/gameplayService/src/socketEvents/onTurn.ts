import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onTurn =
  (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) =>
  (username: string, roomId: string) => {
    socket.to(roomId).emit("turn", username);
  };
