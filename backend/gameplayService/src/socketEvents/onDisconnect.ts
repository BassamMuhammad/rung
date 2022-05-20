import {
  getFirestore,
  query,
  collection,
  getDocs,
  arrayRemove,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import { Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export const onDisconnect =
  (socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) =>
  () => {
    socket.to(socket.data["roomId"]).emit("user-left", socket.data["username"]);
  };
