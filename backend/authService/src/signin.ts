import { Request, Response } from "express";
import { signInWithEmailAndPassword, getAuth, AuthError } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";

export const signin = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const cred = await signInWithEmailAndPassword(getAuth(), email, password);
    const userId = cred.user.uid;
    const user = await getDoc(doc(getFirestore(), "users", userId));
    const username = user.get("username");
    res.json({ data: { userId, username } });
  } catch (e) {
    const err = e as AuthError;
    res.status(400).json({ error: { message: err.message, code: err.code } });
  }
};
