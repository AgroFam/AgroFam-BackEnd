import mongoose from 'mongoose';

const postSchema = mongoose.Schema({
  title: String,
  message: {
    english: String,
    hindi: String,
    marathi: String,
    gujarati: String,
    punjabi: String,
    tamil: String,
    telugu: String,
    bengali: String,
    kannada: String,
    malayalam: String,
  },
  name: String,
  creator: String,
  creatorImg: String,
  tags: [String],
  selectedFile: String,
  likes: {
    type: [String],
    default: [],
  },
  comments: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
  selectedFileId: String,
});

const PostMessage = mongoose.model('PostMessage', postSchema);

export default PostMessage;
