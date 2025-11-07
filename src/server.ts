import app from "./app";
const port = 4000;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
