import React, { useState } from "react";
import Login from "./components/Login";
import GameRoom from "./components/GameRoom";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (username) => {
    if (!username) {
      setError("Invalid username");
      return;
    }
    setUsername(username);
    setIsLoggedIn(true);
    setError("");
  };

  const handleError = (message) => {
    setError(message);
    setIsLoggedIn(false);
    setUsername("");
  };

  return (
    <div>
      {isLoggedIn ? (
        <GameRoom username={username} onError={handleError} />
      ) : (
        <Login onLogin={handleLogin} error={error} />
      )}
    </div>
  );
}

export default App;