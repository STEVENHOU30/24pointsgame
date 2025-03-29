import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: String,
  type: String,
  subtype: String,
  content_type: {
    type:String,
    enum: ['text', 'image'],
    default: 'text',
  },
  content: String,
  sentTime: Date,
  system: {
    type: Boolean,
    default: true, // 默认值为 false（用户消息）
  },
});

const Message = mongoose.model('Message', messageSchema);

export default Message;
