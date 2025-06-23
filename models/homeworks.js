const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  subSection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubSection',
    required: true,
  },
  answerText: {
    type: String,
    default: "",
  },
  file: {
    url: String,
    filename: String,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  reviewed: {
    type: Boolean,
    default: false,
  },
  score: {
    type: Number,
    default: null,
  },
  feedback: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["reviewed", "not_reviewed", "resubmission", "not_started"],
    default: "not_started",
  },
});

module.exports = mongoose.model('Homeworks', homeworkSchema);
