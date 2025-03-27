import { useState } from "react";
import { useNavigate } from "react-router-dom"; // 引入 useNavigate
import "../Login.css";

export function Login({ error: externalError }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState(externalError || "");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      // 跳转到游戏页面，并传递 username
      navigate("/game", { state: { username } });
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
