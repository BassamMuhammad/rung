import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onSendMessage =
  (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) =>
  (roomId: string, username: string, message: string) => {
    socket.to(roomId).emit("receive-message", username, message);
  };
