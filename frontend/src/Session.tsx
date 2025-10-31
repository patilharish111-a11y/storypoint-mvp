import React, { useEffect, useState } from "react";

export default function SessionView({ token, user, socket }: any) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    socket.on("story_added", (s: any) => {
      setStories(prev => [...prev, s]);
    });
    socket.on("vote_summary", (summary: any) => {
      // update local placeholder
      console.log("vote summary", summary);
    });
    socket.on("votes_revealed", (payload: any) => {
      console.log("votes revealed", payload);
      // replace story votes if needed
    });
    socket.on("story_finalized", (s: any) => {
      setStories(prev => prev.map(st => st.id === s.id ? s : st));
    });
    return () => {
      socket.off("story_added");
      socket.off("vote_summary");
      socket.off("votes_revealed");
      socket.off("story_finalized");
    };
  }, [socket]);

  async function createSession() {
    const res = await fetch("http://localhost:4000/api/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Team session" })
    });
    const data = await res.json();
    setSessionId(data.id);
    setSession(data);
    socket.emit("join_session", { sessionId: data.id, userId: user?.id, name: user?.email });
  }

  async function addStory() {
    if (!sessionId || !newTitle) return;
    socket.emit("add_story", { sessionId, title: newTitle });
    setNewTitle("");
  }

  async function castVote(storyId: string, value: string) {
    socket.emit("cast_vote", { sessionId, storyId, userId: user?.id, value });
  }

  async function reveal(storyId: string) {
    socket.emit("reveal_votes", { sessionId, storyId });
  }

  async function finalize(storyId: string, finalPoint: string) {
    socket.emit("finalize_story", { sessionId, storyId, finalPoint });
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Welcome, {user?.email}</h2>
      {!sessionId ? (
        <>
          <button onClick={createSession}>Create session (team)</button>
        </>
      ) : (
        <>
          <div>
            <h3>Session: {session?.name || sessionId}</h3>
            <div>
              <input placeholder="Story title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              <button onClick={addStory}>Add story</button>
            </div>
            <div style={{ marginTop: 16 }}>
              <h4>Stories</h4>
              {stories.map(s => (
                <div key={s.id} style={{ border: "1px solid #ccc", padding: 8, marginBottom: 8 }}>
                  <div><strong>{s.title}</strong></div>
                  <div>{s.description}</div>
                  <div style={{ marginTop: 8 }}>
                    <button onClick={() => castVote(s.id, "1")}>1</button>
                    <button onClick={() => castVote(s.id, "2")}>2</button>
                    <button onClick={() => castVote(s.id, "3")}>3</button>
                    <button onClick={() => castVote(s.id, "5")}>5</button>
                    <button onClick={() => castVote(s.id, "?")}>?</button>
                    <button onClick={() => reveal(s.id)} style={{ marginLeft: 8 }}>Reveal</button>
                    <button onClick={() => finalize(s.id, "3")} style={{ marginLeft: 8 }}>Finalize(3)</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}