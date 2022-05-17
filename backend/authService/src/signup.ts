import { Request, Response } from "express";
import {
  createUserWithEmailAndPassword,
  getAuth,
  AuthError,
} from "firebase/auth";
import axios from "axios";

export const signup = async (req: Request, res: Response) => {
  const { profilePic, username, email, password } = req.body;
  try {
    console.log("before");
    const checkRes = await axios.post("http://localhost:4004/check", {
      username,
      checkWithUsername: true,
    });
    if (checkRes.data["data"]) {
      res.status(400).json({
        error: { message: "Username already exsits", code: "UsernameExists" },
      });
    } else {
      const cred = await createUserWithEmailAndPassword(
        getAuth(),
        email,
        password
      );
      const userId = cred.user.uid;
      const userRes = await axios.post("http://localhost:4004/add-user-data", {
        userId,
        email,
        profilePic,
        username,
      });
      res.json(userRes.data);
    }
  } catch (e) {
    const err = e as AuthError;
    res.status(400).json({ error: { message: err.message, code: err.code } });
  }
};
