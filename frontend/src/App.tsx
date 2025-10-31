import React, { useState, useEffect } from "react";
import Login from "./Login";
import SessionView from "./Session";
import io from "socket.io-client";

const socket = io("http://localhost:4000");

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<any>(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (token) localStorage.setItem("token", token); else localStorage.removeItem("token");
  }, [token]);
  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user)); else localStorage.removeItem("user");
  }, [user]);

  if (!token) {
    return <Login onLoggedIn={(t, u) => { setToken(t); setUser(u); }} />;
  }

  return <SessionView token={token} user={user} socket={socket} />;
}
