import { Request, Response } from "express";
import { AuthError } from "firebase/auth";
import {
  query,
  collection,
  where,
  getFirestore,
  getDocs,
} from "firebase/firestore";

export const check = async (req: Request, res: Response) => {
  const { username, userId, checkWithUsername } = req.body;
  try {
    const at = checkWithUsername
      ? where("username", "==", username)
      : where("userId", "==", userId);
    const q = query(collection(getFirestore(), "users"), at);
    const users = await getDocs(q);
    if (users.size > 0) res.status(200).json({ data: { username, userId } });
    else {
      res.json({ error: { message: "Not found", code: "Not found" } });
    }
  } catch (e) {
    const err = e as AuthError;
    res.status(400).json({ error: { message: err.message, code: err.code } });
  }
};
