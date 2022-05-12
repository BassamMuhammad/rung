import { Request, Response } from "express";
import { setDoc, doc, getFirestore, FirestoreError } from "firebase/firestore";
import { v4 } from "uuid";

export const createRoom = async (req: Request, res: Response) => {
  const { username, isFriendly } = req.body;
  const roomId = v4();
  try {
    await setDoc(
      doc(getFirestore(), isFriendly ? "friendlyRooms" : "onlineRooms", roomId),
      {
        name: roomId,
        users: [username],
      }
    );
    res.json({ data: { roomId } });
  } catch (e) {
    const err = e as FirestoreError;
    res.status(400).json({ error: { message: err.message, code: err.code } });
  }
};
