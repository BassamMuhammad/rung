import axios from "axios";
import { Request, Response } from "express";
import { signInWithEmailAndPassword, getAuth, AuthError } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";

export const signin = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const cred = await signInWithEmailAndPassword(getAuth(), email, password);
    const userId = cred.user.uid;
    const user = await axios.get(
      `http://localhost:4004/get-user-data?userId=${userId}`
    );
    res.json({
      data: { userId, username: user.data["data"]["user"]["username"] },
    });
  } catch (e) {
    const err = e as AuthError;
    res.status(400).json({ error: { message: err.message, code: err.code } });
  }
};
