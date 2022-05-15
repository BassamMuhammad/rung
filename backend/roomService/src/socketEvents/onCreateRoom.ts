import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { onRoomEntered } from "../helpers/onRoomEntered";

export const onCreateRoom =
  (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) =>
  async (username: string, roomId: string) => {
    try {
      const usernames = [username];
      socket.data["username"] = username;
      socket.data["roomId"] = roomId;
      onRoomEntered(socket, usernames, username, roomId, true);
    } catch (error) {
      socket.emit("error", "Error occured. Try again");
    }
  };
