import { useState } from "react";
import "../Login.css";

export function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username);
    } else {
      setError("Please enter a username.");
    }
  };

  return (
    <div className="login-container">
      <h1>♠️ Poker Room ♥️</h1>
      <p>Choose your player name</p>
      {error && <p className="error">{error}</p>}
      <form className="login-form" onSubmit={handleLogin}>
        <input
          type="text"
          value={username}
          placeholder="Enter your poker nickname"
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <button className="join-room" type="submit">
          ♣️ Join Game Room ♦️
        </button>
      </form>
      <div className="card-decorations">
        <span className="card red">♥️</span>
        <span className="card black">♠️</span>
        <span className="card red">♦️</span>
        <span className="card black">♣️</span>
      </div>
    </div>
  );
}

export default Login;