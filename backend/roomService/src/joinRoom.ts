import { Request, Response } from "express";
import {
  getDoc,
  updateDoc,
  arrayUnion,
  doc,
  getFirestore,
  FirestoreError,
} from "firebase/firestore";

export const joinRoom = async (req: Request, res: Response) => {
  const { roomId, username, isFriendly } = req.body;
  try {
    const roomRef = doc(
      getFirestore(),
      isFriendly ? "friendlyRooms" : "onlineRooms",
      roomId
    );
    const roomSnap = await getDoc(roomRef);

    if (roomSnap.exists()) {
      const numRoomUsers: number = await roomSnap.get("users").length;
      if (numRoomUsers >= 4)
        res
          .status(406)
          .json({ error: { message: "Room is full", code: "FullRoom" } });
      else {
        await updateDoc(roomRef, {
          users: arrayUnion(username),
        });
        res.json({
          data: { len: numRoomUsers + 1 },
        });
      }
    } else {
      res.status(404).json({
        error: { message: "Room does not exist", code: "NoSuchRoom" },
      });
    }
  } catch (e) {
    const err = e as FirestoreError;
    res.status(400).json({ error: { message: err.message, code: err.code } });
  }
};
