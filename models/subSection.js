const mongoose = require('mongoose');

const subSectionSchema = new mongoose.Schema({
    title: {
        type: String
    },
    timeDuration: {
        type: String
    },
    description: {
        type: String
    },
    videoUrl: {
        type: String
    },
    allowSkip: {
    type: Boolean,
    default: false,
    },
    enableSeek: {
        type: Boolean,
        default: false, 
    },
    homeworks: [
      {
        type: {
          type: String,
          enum: ["text", "link", "file"],
          required: true,
        },
        value: {
          type: mongoose.Schema.Types.Mixed, 
          required: true,
        }
      }
    ],
    requiresHomeworkCheck: {
      type: Boolean,
      default: false
    },
    minScore: {
    type: Number,
    default: null,
    },
    maxScore: {
      type: Number,
      default: null,
    },
    delayedHomeworkCheck: { 
      type: Boolean, 
      default: false 
    },
    homeworkDelaySeconds: { 
      type: Number, 
      default: 0 
    },
});

module.exports = mongoose.model('SubSection', subSectionSchema) 