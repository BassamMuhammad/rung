import express from "express";

const app = express();
const PORT = process.env.PORT || 4000;

app.get("/", (req, res) => res.json({ res: "a" }));
app.listen(PORT, () => {
  console.log(`Listening on port:${PORT}`);
});
