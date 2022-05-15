import { Server } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const getUsernamesInRoom = async (
  io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
  roomId: string
) => {
  const sockets = await io.in(roomId).fetchSockets();
  const usernames: string[] = [];
  sockets.forEach((socket) => {
    usernames.push(socket.data["username"]);
  });
  return usernames;
};
