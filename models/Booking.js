const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 2,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  vehicle: {
    type: String,
    required: true,
    trim: true
  },
  service: {
    type: String,
    required: true,
    enum: ["Oil Change", "Tire Swap / Balance", "Brake Service", "Inspection / Other"]
  },
  date: {
    type: Date,
    required: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  photo: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;