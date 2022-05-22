import { Request, Response } from "express";
import { getDoc, doc, getFirestore } from "firebase/firestore";

export const getUserData = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId)
      res.status(400).json({ erro: { message: "User Id is empty" } });
    else {
      const user = await getDoc(doc(getFirestore(), "users", userId as string));
      res.status(200).json({ data: { user: user.data() } });
    }
  } catch (error) {
    res.status(400).json({ error });
  }
};
