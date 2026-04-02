import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

type BetType = "equal_7" | "less_7" | "greater_7";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/roll", (req, res) => {
    const { betAmount, betType } = req.body as { betAmount?: number; betType?: BetType };

    if (!Number.isFinite(betAmount) || (betAmount ?? 0) <= 0) {
      return res.status(400).json({ error: "Invalid bet amount" });
    }

    if (!["equal_7", "less_7", "greater_7"].includes(String(betType))) {
      return res.status(400).json({ error: "Invalid bet type" });
    }

    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const sum = die1 + die2;

    let win = false;
    let multiplier = 0;

    if (betType === "equal_7") {
      if (sum === 7) {
        win = true;
        multiplier = 5.8;
      }
    } else if (betType === "less_7") {
      if (sum < 7) {
        win = true;
        multiplier = 2.3;
      }
    } else if (betType === "greater_7") {
      if (sum > 7) {
        win = true;
        multiplier = 2.3;
      }
    }

    const payout = win ? betAmount * multiplier : 0;

    res.json({
      die1,
      die2,
      sum,
      win,
      payout,
      multiplier: win ? multiplier : 0
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
