import express from "express";

const router = express.Router();

router.post("/", async (req, res) => {
  const event = req.body;

  if (event && event.type === "email.received") {
    return res.json(event);
  }

  return res.json({});
});

export default router;
