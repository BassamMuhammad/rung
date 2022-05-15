import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { getUsernamesInRoom } from "../helpers/getUsernamesInRoom";
import { onRoomEntered } from "../helpers/onRoomEntered";

export const onJoinRoom =
  (
    io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
  ) =>
  async (username: string, roomId: string) => {
    if (!io.sockets.adapter.rooms.get(roomId))
      socket.emit("error", "Room does not exist");
    else if (io.sockets.adapter.rooms.get(roomId)!.size >= 4)
      socket.emit("error", "Room full");
    else {
      try {
        // const usernames = await getUsernamesFromFriendlyRoom(roomId);
        const usernames = await getUsernamesInRoom(io, roomId);
        if (usernames.includes(username)) {
          socket.emit(
            "error",
            `User name already taken. Taken username list: ${usernames} `
          );
        } else {
          socket.data["username"] = username;
          socket.data["roomId"] = roomId;
          usernames.push(username);
          onRoomEntered(socket, usernames, username, roomId, true);
        }
      } catch (error) {
        socket.emit("error", "Error occured. Try again");
      }
    }
  };
