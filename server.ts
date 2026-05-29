import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

interface Message {
  id: string;
  name: string;
  text: string;
  timestamp: number;
}

// In-memory message store
const messages: Message[] = [
  {
    id: "1",
    name: "System",
    text: "Добро пожаловать в общий чат! Вы можете оставлять свои сообщения здесь.",
    timestamp: Date.now(),
  }
];

const clients = new Set<express.Response>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // SSE endpoint for real-time updates
  app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders(); // flush the headers to establish connection

    clients.add(res);

    req.on("close", () => {
      clients.delete(res);
    });
  });

  // Get all messages
  app.get("/api/messages", (req, res) => {
    res.json(messages);
  });

  // Post a new message
  app.post("/api/messages", (req, res) => {
    const { name, text } = req.body;
    
    if (!name || !text || name.trim() === "" || text.trim() === "") {
      return res.status(400).json({ error: "Name and text are required" });
    }

    const newMessage: Message = {
      id: Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      text: text.trim(),
      timestamp: Date.now(),
    };

    messages.push(newMessage);

    // Keep memory usage in check (e.g., keep only last 500 messages)
    if (messages.length > 500) {
      messages.shift();
    }

    // Broadcast to all clients
    clients.forEach(client => {
      client.write(`data: ${JSON.stringify(newMessage)}\n\n`);
    });

    res.status(201).json(newMessage);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
