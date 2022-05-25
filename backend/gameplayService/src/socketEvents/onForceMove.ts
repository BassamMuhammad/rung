import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onForceMove =
  (
    io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
    socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
  ) =>
  async (roomId: string, moveNum: string, index: number, username: string) => {
    const sockets = await io.in(roomId).fetchSockets();
    const sockMoveNum = sockets[0].data["moveNum"];
    if (sockMoveNum) {
      const sockMoveNumArr = sockMoveNum.split("-");
      const moveNumArr = moveNum.split("-");
      if (
        parseInt(sockMoveNumArr[0]) > parseInt(moveNumArr[0]) ||
        (parseInt(sockMoveNumArr[0]) === parseInt(moveNumArr[0]) &&
          parseInt(sockMoveNumArr[1]) >= parseInt(moveNumArr[1]))
      )
        return;
    }
    sockets.forEach((sock) => {
      sock.data["moveNum"] = moveNum;
    });
    socket.emit("move", index, username);
    socket.to(roomId).emit("move", index, username);
  };
