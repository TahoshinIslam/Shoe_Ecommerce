import express from "express";
const port = 5001;
const app = express();

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => console.log(`Server is running in port ${port}`));
