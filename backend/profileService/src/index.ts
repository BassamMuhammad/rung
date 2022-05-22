import "dotenv/config";
import express from "express";
import { initializeApp } from "firebase/app";
import cors from "cors";
import { editPic } from "./editPic";
import { customizeCards } from "./customizeCard";
import { addUserData } from "./addUserData";
import { getUserData } from "./getUserData";
import { check } from "./check";
import multer from "multer";

const upload = multer();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_ID,
  appId: process.env.FIREBASE_APP_ID,
};
initializeApp(firebaseConfig);

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

const PORT = (process.env.PORT && parseInt(process.env.PORT!)) || 4004;

app.post("/add-user-data", addUserData);
app.get("/get-user-data", getUserData);
app.post("/customize-cards", upload.array("customCards"), customizeCards);
app.post("/check", check);
app.post("/edit-pic", upload.single("profilePic"), editPic);

app.listen(PORT, () => {
  `listening at ${PORT}`;
});
