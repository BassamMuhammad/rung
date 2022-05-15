import { Request, Response } from "express";
import { signOut, getAuth, AuthError, signInAnonymously } from "firebase/auth";

export const logout = async (req: Request, res: Response) => {
  try {
    await signOut(getAuth());
    res.json({ data: { message: "Successfully logout" } });
  } catch (e) {
    const err = e as AuthError;
    res.status(400).json({ error: { message: err.message, code: err.code } });
  }
};
