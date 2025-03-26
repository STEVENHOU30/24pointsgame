import mongoose from 'mongoose';

const mongoURI = 'mongodb+srv://HOUSIQI:YWCykoqTvbbUwNhk@chatroom-information.wlguk.mongodb.net/?retryWrites=true&w=majority&appName=Chatroom-information';

mongoose.connect(mongoURI);

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Successfully connect to MongoDB Atlas');
});

export default db;