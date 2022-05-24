import { Request, Response } from "express";
import { doc, getFirestore, updateDoc } from "firebase/firestore";
import { saveFile } from "./saveFile";

export const customizeCards = async (req: Request, res: Response) => {
  try {
    const { userId, customCardsValue } = req.body;
    const customCards = req.files! as Express.Multer.File[];
    const frontCustomCardsWithValues: [string, Buffer][] = [];
    let backCustomCard;
    const dbFrontCustomCardsKey = "frontCustomCards";
    if (customCards.length === 1) {
      if (customCardsValue === "back") backCustomCard = customCards[0].buffer;
      else
        frontCustomCardsWithValues.push([
          `${dbFrontCustomCardsKey}.${customCardsValue}`,
          customCards[0].buffer,
        ]);
    } else {
      customCards.forEach((customCard, i) => {
        if (customCardsValue[i] === "back") backCustomCard = customCard.buffer;
        else
          frontCustomCardsWithValues.push([
            `${dbFrontCustomCardsKey}.${customCardsValue[i]}`,
            customCard.buffer,
          ]);
      });
    }
    for (let i = 0; i < frontCustomCardsWithValues.length; i++) {
      const [card, file] = frontCustomCardsWithValues[i];
      const url = await saveFile(`cards/${userId}/${card}`, file);
      await updateDoc(doc(getFirestore(), "users", userId), {
        [card]: url,
      });
    }
    if (backCustomCard) {
      const url = await saveFile(`cards/${userId}/back`, backCustomCard);
      await updateDoc(doc(getFirestore(), "users", userId), {
        backCustomCard: url,
      });
    }
    res.status(200).json({ data: "success" });
  } catch (error) {
    res.status(400).json({ error: { message: "Error occured. Try again" } });
  }
};
