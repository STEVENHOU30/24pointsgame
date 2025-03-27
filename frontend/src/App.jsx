import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import GameRoom from "./components/GameRoom";
import Login from "./components/Login";

// 由于 useLocation 只能在 Router 内部使用，我们创建一个包装组件
function LoginWrapper() {
  const location = useLocation();
  const error = location.state?.error || ""; // 从路由状态获取错误信息
  return <Login error={error} />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginWrapper />} />
        <Route path="/game" element={<GameRoom />} />
      </Routes>
    </Router>
  );
}

export default App;
