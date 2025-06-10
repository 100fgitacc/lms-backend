const mongoose = require('mongoose');

const courseProgressSchema = new mongoose.Schema(
  {
    courseID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    completedVideos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubSection'
      }
    ],
    currentSubSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubSection'
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date,
      default: null
    },
    allowedToSkip: [{ type: mongoose.Schema.Types.ObjectId, ref: "SubSection" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('CourseProgress', courseProgressSchema);
