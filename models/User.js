const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /.+@.+\..+/
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["admin"],
    default: "admin"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model("User", userSchema);

module.exports = User;