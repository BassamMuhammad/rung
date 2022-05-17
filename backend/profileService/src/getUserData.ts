import { Request, Response } from "express";
import { getDoc, doc, getFirestore } from "firebase/firestore";

export const getUserData = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    const user = await getDoc(doc(getFirestore(), "users", userId));
    res.status(202).json({ data: { user: user.data() } });
  } catch (error) {
    res.status(400).json({ error });
  }
};
