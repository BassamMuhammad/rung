import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onRoomEntered = async (
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
  usernames: string[],
  newUser: string,
  roomId: string,
  isFriendly: boolean
) => {
  socket.join(roomId);
  socket.emit("in-room", newUser, roomId, isFriendly);
  socket.to(roomId).emit("entered-room", usernames, roomId);
};
