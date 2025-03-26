import { WebSocketServer } from "ws";
import http from "http";
import { v4 as uuidv4 } from "uuid";

const server = http.createServer();
const wsServer = new WebSocketServer({ server });
const port = 53840;
const connections = {};
const users = {};

const gameState = {
  cards: [],
  scores: {},
  winner: null,
  roundWin: null,
  cardChangeRequest: null, // 存储更换卡牌请求
  agreedUsers: [], // 存储同意更换的用户
  startedUsers: [],
};

let DEFAULT_ROOM_UUID = '老公老婆在一起';

function broadcastToRoom(message) {
  Object.keys(connections).forEach((uuid) => {
    const connection = connections[uuid];
    if (connection.readyState === 1) {
      connection.send(JSON.stringify(message));
    }
  });
}

function broadcastUserList() {
  const roomUsers = Object.keys(users)
    .map((uuid) => users[uuid].username)
    .filter((username) => username);
  broadcastToRoom({ type: "userList", users: roomUsers });
}

async function handleMessage(messageStr, connection) {
  const message = JSON.parse(messageStr);
  const user = users[connection.uuid];

  if (message.type === "start_game") {
    console.log("Received start_game message from:", message.username);
    if (!gameState.startedUsers.includes(message.username)) {
      gameState.startedUsers.push(message.username);
    }
    broadcastToRoom({
      type: "game",
      subtype: "start_game_status",
      startedUsers: gameState.startedUsers,
    });

    const allUsers = Object.keys(users).map((uuid) => users[uuid].username);
  if (gameState.startedUsers.length === allUsers.length) {
    console.log("All users have started the game!");
    broadcastToRoom({
      type: "game",
      subtype: "game_start",
    });
    gameState.cards = [];
      gameState.cardChangeRequest = null; // 清空更换卡牌请求
      gameState.agreedUsers = []; // 清空同意用户列表
      broadcastToRoom({
        type: "game",
        subtype: "new_round",
      });
  }
  }
  else if (message.type === "set_name") {
    user.username = message.name;
    console.log(`User ${message.name} joined the room!`);

    if (!gameState.scores[user.username]) {
      gameState.scores[user.username] = 0;
    }

    broadcastToRoom({
      sender: "System",
      content: `${user.username} joined!`,
      sentTime: new Date(),
      system: true,
    });

    broadcastUserList();
    broadcastToRoom({
      type: "game",
      subtype: "score",
      scores: gameState.scores,
      winner: gameState.winner,
    });

    if (gameState.cards.length > 0) {
      broadcastToRoom({
        type: "game",
        subtype: "cards",
        cards: gameState.cards,
      });
    }
  } else if (message.type === "chat") {
    const newMessage = {
      sender: user.username,
      type: message.subtype || "text",
      content: message.content,
      sentTime: new Date(),
    };
    broadcastToRoom(newMessage);
  } else if (message.type === "game") {
    if (message.subtype === "cards") {
      gameState.cards = message.cards;
      broadcastToRoom({
        type: "game",
        subtype: "cards",
        cards: gameState.cards,
      });
    } else if (message.subtype === "score") {
      gameState.scores = message.scores;
      if (message.winner) {
        gameState.winner = message.winner;
      } else {
        gameState.roundWin = message.roundWin;
      }
      broadcastToRoom({
        type: "game",
        subtype: "score",
        scores: gameState.scores,
        winner: gameState.winner,
        roundWin: gameState.roundWin,
      });
    } else if (message.subtype === "new_round") {
      gameState.cards = [];
      gameState.cardChangeRequest = null; // 清空更换卡牌请求
      gameState.agreedUsers = []; // 清空同意用户列表
      broadcastToRoom({
        type: "game",
        subtype: "new_round",
      });
    } else if (message.subtype === "request_card_change") {
      if (!message.agreedUser) {
        // 发起更换卡牌请求
        gameState.cardChangeRequest = message.requester;
        gameState.agreedUsers = [message.requester]; // 发起者默认同意
      } else {
        // 其他用户同意更换
        if (!gameState.agreedUsers.includes(message.agreedUser)) {
          gameState.agreedUsers.push(message.agreedUser);
        }
      }
      broadcastToRoom({
        type: "game",
        subtype: "request_card_change",
        requester: gameState.cardChangeRequest,
        agreedUsers: gameState.agreedUsers,
      });

      const allUsers = Object.keys(users)
        .map((uuid) => users[uuid].username)
        .filter((username) => username);
      if (gameState.agreedUsers.length === allUsers.length) {
        // 所有用户同意，触发更换卡牌 
        broadcastToRoom({
          type: "game",
          subtype: "new_round",
        }); 
        gameState.cardChangeRequest = null;
        gameState.agreedUsers = [];
        gameState.cards = []; // 清空卡牌，触发前端生成新卡牌  
       
      }
    }
  }
}

async function handleClose(connection) {
  const uuid = connection.uuid;
  const username = users[uuid]?.username;

  if (username) {
    console.log(`User ${username} disconnected`);
    delete gameState.scores[username];
    if (gameState.cardChangeRequest === username) {
      gameState.cardChangeRequest = null;
      gameState.agreedUsers = [];
      broadcastToRoom({
        type: "game",
        subtype: "request_card_change",
        requester: null,
        agreedUsers: [],
      });
    }
    broadcastToRoom({
      type: "game",
      subtype: "score",
      scores: gameState.scores,
      winner: gameState.winner,
    });
  }

  delete connections[uuid];
  delete users[uuid];
  broadcastUserList();
}

wsServer.on("connection", (connection, request) => {
  const connectionId = uuidv4();
  connection.uuid = connectionId;
  connections[connectionId] = connection;
  users[connectionId] = { roomUUID: DEFAULT_ROOM_UUID };

  console.log(`New connection: ${connectionId}`);

  broadcastUserList();

  if (gameState.cards.length > 0) {
    connection.send(
      JSON.stringify({
        type: "game",
        subtype: "cards",
        cards: gameState.cards,
      })
    );
  }
  if (gameState.scores) {
    connection.send(
      gameState.winner
        ? JSON.stringify({
            type: "game",
            subtype: "score",
            scores: gameState.scores,
            winner: gameState.winner,
          })
        : JSON.stringify({
            type: "game",
            subtype: "score",
            scores: gameState.scores,
            roundWin: gameState.roundWin,
          })
    );
  }
  if (gameState.cardChangeRequest) {
    connection.send(
      JSON.stringify({
        type: "game",
        subtype: "request_card_change",
        requester: gameState.cardChangeRequest,
        agreedUsers: gameState.agreedUsers,
      })
    );
  }

  connection.on("message", (message) => {
    handleMessage(message.toString(), connection);
  });

  connection.on("close", () => {
    handleClose(connection);
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

