import { Request, Response } from "express";
import { signInWithEmailAndPassword, getAuth, AuthError } from "firebase/auth";

export const signin = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const cred = await signInWithEmailAndPassword(getAuth(), email, password);
    res.json({ data: { userId: cred.user.uid } });
  } catch (e) {
    const err = e as AuthError;
    res.status(400).json({ error: { message: err.message, code: err.code } });
  }
};
