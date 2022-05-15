import { Request, Response } from "express";
import { signOut, getAuth, AuthError, signInAnonymously } from "firebase/auth";
import {
  query,
  collection,
  where,
  getFirestore,
  getDocs,
} from "firebase/firestore";

export const check = async (req: Request, res: Response) => {
  const { username, userId } = req.body;
  try {
    const q = query(
      collection(getFirestore(), "users"),
      where("userId", "==", userId)
    );
    const users = await getDocs(q);
    if (users.size > 0) res.json({ data: { username, userId } });
    else
      res
        .status(404)
        .json({ error: { message: "Not found", code: "Not found" } });
  } catch (e) {
    const err = e as AuthError;
    res.status(400).json({ error: { message: err.message, code: err.code } });
  }
};
