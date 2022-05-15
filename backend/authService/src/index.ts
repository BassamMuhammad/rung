import "dotenv/config";
import express from "express";
import cors from "cors";
import { initializeApp } from "firebase/app";
import { logout } from "./logout";
import { signin } from "./signin";
import { signup } from "./signup";
import { check } from "./check";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const PORT = process.env.PORT || 4003;

initializeApp(firebaseConfig);

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.post("/signup", signup);
app.post("/signin", signin);
app.post("/logout", logout);
app.post("/check", check);

app.listen(PORT, () => {
  console.log(`Listening on port:${PORT}`);
});
