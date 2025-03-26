import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: String,
  type: String,
  content: String,
  sentTime: Date,
});

const Message = mongoose.model('Message', messageSchema);

export default Message;