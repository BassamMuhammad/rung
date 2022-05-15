import { Request, Response } from "express";
import cookie from "cookie";
import {
  createUserWithEmailAndPassword,
  getAuth,
  AuthError,
} from "firebase/auth";
import {
  doc,
  getFirestore,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
export const signup = async (req: Request, res: Response) => {
  const { profilePic, username, email, password } = req.body;
  try {
    const q = query(
      collection(getFirestore(), "users"),
      where("username", "==", username)
    );
    const users = await getDocs(q);
    if (users.size > 0) {
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
      let picUrl = "";
      if (profilePic) {
        const storageRef = ref(getStorage(), `profilePic/${userId}`);
        await uploadBytes(storageRef, profilePic);
        picUrl = await getDownloadURL(storageRef);
      }
      await setDoc(doc(getFirestore(), "users", userId), {
        userId,
        username,
        email,
        profilePic: picUrl,
      });
      res.json({ data: { userId, username } });
    }
  } catch (e) {
    const err = e as AuthError;
    res.status(400).json({ error: { message: err.message, code: err.code } });
  }
};
