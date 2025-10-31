import { Express } from "express";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export function initRoutes(app: Express, prisma: PrismaClient) {
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Create magic link token (dev: prints link to console)
  app.post("/api/auth/magic-link", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "email required" });
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 min
    await prisma.authToken.create({ data: { email, token, expiresAt } });
    const magicUrl = `${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}/auth/verify?token=${token}`;
    console.log("MAGIC LINK (dev):", magicUrl);
    // For convenience return the magicUrl in response in dev mode
    return res.json({ ok: true, magicUrl });
  });

  // Verify token and return JWT
  app.get("/api/auth/verify", async (req, res) => {
    const token = req.query.token as string;
    if (!token) return res.status(400).json({ error: "token required" });
    const row = await prisma.authToken.findUnique({ where: { token } });
    if (!row) return res.status(400).json({ error: "invalid token" });
    if (row.expiresAt < new Date() || row.used) return res.status(400).json({ error: "token expired or used" });
    // Upsert user
    let user = await prisma.user.findUnique({ where: { email: row.email } });
    if (!user) {
      user = await prisma.user.create({ data: { email: row.email } });
    }
    await prisma.authToken.update({ where: { token }, data: { used: true } });
    const jwtToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token: jwtToken, user: { id: user.id, email: user.email } });
  });

  // Auth middleware
  const authMiddleware = async (req: any, res: any, next: any) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "unauthorized" });
    const [, t] = auth.split(" ");
    try {
      const payload: any = jwt.verify(t, JWT_SECRET);
      req.user = payload;
      next();
    } catch (e) {
      return res.status(401).json({ error: "invalid token" });
    }
  };

  // Create session
  app.post("/api/sessions", authMiddleware, async (req: any, res) => {
    const { name } = req.body;
    const session = await prisma.session.create({
      data: { name: name || "Untitled session", hostUserId: req.user.userId }
    });
    res.json(session);
  });

  // Get session details (without revealing votes)
  app.get("/api/sessions/:id", authMiddleware, async (req: any, res) => {
    const { id } = req.params;
    const session = await prisma.session.findUnique({
      where: { id },
      include: { stories: { include: { votes: true } } }
    });
    if (!session) return res.status(404).json({ error: "not found" });
    // redact votes values unless story.finalPoint exists (revealed)
    const stories = session.stories.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      finalPoint: s.finalPoint,
      createdAt: s.createdAt,
      votes: s.finalPoint ? s.votes : s.votes.map(v => ({ id: v.id, anonId: v.anonId, userId: v.userId }))
    }));
    return res.json({ ...session, stories });
  });

  // Add story
  app.post("/api/sessions/:id/stories", authMiddleware, async (req: any, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    const story = await prisma.story.create({
      data: { sessionId: id, title, description }
    });
    // Note: socket broadcasting done in socket.ts when story-add event received from client
    return res.json(story);
  });

  // Cast vote
  app.post("/api/stories/:id/votes", authMiddleware, async (req: any, res) => {
    const { id } = req.params;
    const { value, anonId } = req.body;
    const userId = req.user.userId;
    // upsert: if user already voted on story replace
    const existing = await prisma.vote.findFirst({ where: { storyId: id, userId } });
    if (existing) {
      const v = await prisma.vote.update({ where: { id: existing.id }, data: { value } });
      return res.json(v);
    }
    const vote = await prisma.vote.create({ data: { storyId: id, userId, value, anonId } });
    return res.json(vote);
  });

  // Reveal votes (host-only)
  app.post("/api/stories/:id/reveal", authMiddleware, async (req: any, res) => {
    const { id } = req.params;
    const story = await prisma.story.findUnique({ where: { id }, include: { session: true } });
    if (!story) return res.status(404).json({ error: "not found" });
    if (story.session.hostUserId !== req.user.userId) return res.status(403).json({ error: "forbidden" });
    // For simplicity flag finalPoint to "REVEALED" (frontend will request votes)
    // Real app would keep separate revealed flag; here we keep finalPoint null and frontend can request votes via session endpoint after reveal
    // We'll just respond OK — socket will notify clients to fetch votes
    return res.json({ ok: true });
  });

  // Finalize story points
  app.post("/api/stories/:id/finalize", authMiddleware, async (req: any, res) => {
    const { id } = req.params;
    const { finalPoint } = req.body;
    const story = await prisma.story.findUnique({ where: { id }, include: { session: true } });
    if (!story) return res.status(404).json({ error: "not found" });
    if (story.session.hostUserId !== req.user.userId) return res.status(403).json({ error: "forbidden" });
    const updated = await prisma.story.update({ where: { id }, data: { finalPoint } });
    return res.json(updated);
  });
}