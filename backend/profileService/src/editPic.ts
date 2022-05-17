import { Request, Response } from "express";
import { doc, getFirestore, updateDoc } from "firebase/firestore";
import { saveFile } from "./saveFile";

export const editPic = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const profilePic = req.file!.buffer;
    let picUrl = "";
    if (profilePic) {
      picUrl = await saveFile(`profilePic/${userId}`, profilePic);
    }

    await updateDoc(doc(getFirestore(), "users", userId), {
      profilePic: picUrl,
    });
    res.status(200).json({ data: { userId, profilePic } });
  } catch (error) {
    console.log(error);
    res.status(400).json({ error });
  }
};
