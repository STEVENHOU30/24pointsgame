// models/room.js
import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true }, // 房间的邀请码
  users: [{ type: String }], // 房间内的用户列表
  createdAt: { type: Date, default: Date.now },
});

const Room = mongoose.model("Room", roomSchema);
export default Room;