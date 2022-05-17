import { Request, Response } from "express";
import { doc, getFirestore, updateDoc } from "firebase/firestore";
import { saveFile } from "./saveFile";

export const customizeCards = async (req: Request, res: Response) => {
  try {
    const { userId, customCardsValue } = req.body;
    const customCards = req.files! as Express.Multer.File[];
    const frontCustomCardsWithValues: [string, Buffer][] = [];
    let backCustomCard;
    customCards.forEach((customCard, i) => {
      if (customCardsValue[i] === "back") backCustomCard = customCard.buffer;
      else
        frontCustomCardsWithValues.push([
          customCardsValue[i],
          customCard.buffer,
        ]);
    });

    for (let i = 0; i < frontCustomCardsWithValues.length; i++) {
      const [card, file] = frontCustomCardsWithValues[i];
      const url = await saveFile(`cards/${userId}/${card}`, file);
      await updateDoc(doc(getFirestore(), "users", userId), {
        frontCustomCards: {
          [card]: url,
        },
      });
    }
    if (backCustomCard) {
      const url = await saveFile(`cards/${userId}/back`, backCustomCard);
      await updateDoc(doc(getFirestore(), "users", userId), {
        backCustomCard: url,
      });
    }
  } catch (error) {}
};
