import mongoose from 'mongoose';

const userSchema = mongoose.Schema({
  name: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  picture: { type: String },
  isGoogleLogin: { type: String, },
  email: { type: String, required: true },
  password: { type: String },
  id: { type: String },
  email_verified: { type: Boolean, required: true }
});

export default mongoose.model('User', userSchema);
