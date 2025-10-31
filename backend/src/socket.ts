import { Server as IOServer, Socket } from "socket.io";
import { PrismaClient } from "@prisma/client";

export function initSocket(io: IOServer, prisma: PrismaClient) {
  io.on("connection", (socket: Socket) => {
    console.log("socket connected:", socket.id);

    socket.on("join_session", (data: { sessionId: string; userId?: string; name?: string }) => {
      socket.join(data.sessionId);
      io.to(data.sessionId).emit("participant_update", { userId: data.userId, name: data.name, type: "join" });
    });

    socket.on("leave_session", (data: { sessionId: string; userId?: string }) => {
      socket.leave(data.sessionId);
      io.to(data.sessionId).emit("participant_update", { userId: data.userId, type: "leave" });
    });

    socket.on("add_story", async (payload: { sessionId: string; title: string; description?: string }) => {
      // create story in DB
      const story = await prisma.story.create({
        data: { sessionId: payload.sessionId, title: payload.title, description: payload.description }
      });
      io.to(payload.sessionId).emit("story_added", story);
    });

    socket.on("cast_vote", async (payload: { sessionId: string; storyId: string; userId?: string; value: string }) => {
      // create or update vote
      const existing = await prisma.vote.findFirst({ where: { storyId: payload.storyId, userId: payload.userId } });
      let vote;
      if (existing) {
        vote = await prisma.vote.update({ where: { id: existing.id }, data: { value: payload.value } });
      } else {
        vote = await prisma.vote.create({ data: { storyId: payload.storyId, userId: payload.userId, value: payload.value } });
      }
      // do not broadcast value raw (respect reveal rules); we'll broadcast a summary
      const votes = await prisma.vote.findMany({ where: { storyId: payload.storyId } });
      const summary = { storyId: payload.storyId, count: votes.length };
      io.to(payload.sessionId).emit("vote_summary", summary);
    });

    socket.on("reveal_votes", async (payload: { sessionId: string; storyId: string }) => {
      const votes = await prisma.vote.findMany({ where: { storyId: payload.storyId } });
      io.to(payload.sessionId).emit("votes_revealed", { storyId: payload.storyId, votes });
    });

    socket.on("finalize_story", async (payload: { sessionId: string; storyId: string; finalPoint: string }) => {
      const updated = await prisma.story.update({ where: { id: payload.storyId }, data: { finalPoint: payload.finalPoint } });
      io.to(payload.sessionId).emit("story_finalized", updated);
    });

    socket.on("disconnect", () => {
      console.log("socket disconnected:", socket.id);
    });
  });
}