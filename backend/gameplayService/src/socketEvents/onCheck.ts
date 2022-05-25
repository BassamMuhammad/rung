import { doc, getDoc, getFirestore } from "firebase/firestore";
import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onCheck =
  (
    io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
  ) =>
  async (username: string, roomId: string) => {
    try {
      const room = await getDoc(doc(getFirestore(), "rooms", roomId));
      const usernames: string[] = room.get("usernames");

      if (room.get("completed")) {
        socket.emit("not-allowed", "Game completed");
        return;
      }

      if (usernames.includes(username)) {
        socket.join(roomId);
        const sockets = await io.in(roomId).fetchSockets();
        const startIndex = sockets.findIndex((socket) => socket.data["start"]);
        const rungIndex = sockets.findIndex((socket) => socket.data["rung"]);
        const deckIndex = sockets.findIndex((socket) => socket.data["deck"]);
        const positionsIndex = sockets.findIndex(
          (socket) => socket.data["positions"]
        );
        socket.emit("allowed", username);
        socket.data["username"] = username;
        socket.data["roomId"] = roomId;
        if (positionsIndex >= 0) {
          const usersInRoom: string[] = sockets.map(
            (socket) => socket.data["username"]
          );
          const usersLeft: string[] = usernames.filter(
            (uName) => !usersInRoom.includes(uName)
          );
          socket.emit("positions", usernames, usersLeft);
          if (deckIndex >= 0) {
            const deckSocket = sockets[deckIndex];
            socket.emit("deck", deckSocket.data["deck"]);
          }
          if (rungIndex >= 0) {
            const rungSocket = sockets[rungIndex];
            socket.emit("rung", rungSocket.data["rung"]);
          }
          if (startIndex >= 0) {
            const startSocket = sockets[startIndex];
            socket.emit("start-game", true, startSocket.data["history"]);
          }
          socket.to(roomId).emit("reconnect", username);
        } else {
          if (io.sockets.adapter.rooms.get(roomId)!.size === 4) {
            sockets.forEach((sock) => (sock.data["positions"] = usernames));
            socket.emit("positions", usernames);
            socket.to(roomId).emit("positions", usernames);
          }
        }
      } else {
        socket.emit("not-allowed", "No record exist of user");
      }
    } catch (error) {
      socket.emit("error", "Error occured. Try again");
    }
  };
