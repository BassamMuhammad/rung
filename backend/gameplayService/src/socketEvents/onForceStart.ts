import { getDoc, doc, getFirestore } from "firebase/firestore";
import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onForceStart =
  (
    io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
  ) =>
  async (
    roomId: string,
    event: "positions" | "deck" | "rung" | "start",
    force: boolean,
    deck: [],
    rung: string
  ) => {
    const sockets = await io.in(roomId).fetchSockets();
    const room = await getDoc(doc(getFirestore(), "rooms", roomId));
    const usernames: string[] = room.get("usernames");
    if (event === "positions") {
      if (
        !force &&
        sockets.findIndex(
          (sock) => sock.data["positions"] && sock.data["positions"].length > 0
        ) >= 0
      ) {
        socket.emit("reject-start");
        return;
      }
      const usersInRoom: string[] = sockets.map(
        (socket) => socket.data["username"]
      );
      const usersLeft: string[] = usernames.filter(
        (uName) => !usersInRoom.includes(uName)
      );
      sockets.forEach((socket) => {
        socket.data["positions"] = usernames;
        socket.emit("positions", usernames, usersLeft);
      });
    } else if (event === "deck") {
      if (
        !force &&
        sockets.findIndex(
          (sock) => sock.data["deck"] && sock.data["deck"].length > 0
        ) >= 0
      ) {
        socket.emit("reject-start");
        return;
      }
      socket.to(roomId).emit("deck", deck);
    } else if (event === "rung") {
      if (!force && sockets.findIndex((sock) => sock.data["rung"]) >= 0) {
        socket.emit("reject-start");
        return;
      }
      socket.to(roomId).emit("rung", rung);
    } else {
      sockets.forEach((socket) => {
        if (socket.data["deal"]) {
          socket.data["start"] = true;
          socket.emit("start-game", true);
        }
      });
    }
  };
