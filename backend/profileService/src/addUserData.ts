import { Request, Response } from "express";
import { setDoc, doc, getFirestore } from "firebase/firestore";
import { saveFile } from "./saveFile";

export const addUserData = async (req: Request, res: Response) => {
  try {
    const { profilePic, userId, username, email } = req.body;
    let picUrl = "";

    if (profilePic) {
      picUrl = await saveFile(`profilePic/${userId}`, profilePic);
    }

    await setDoc(doc(getFirestore(), "users", userId), {
      userId,
      username,
      email,
      profilePic: picUrl,
      frontCustomCards: {},
      backCustomCard: "",
    });
    res.status(202).json({ data: { userId, username, email, profilePic } });
  } catch (error) {
    res.status(400).json({ error });
  }
};
