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

});

module.exports = mongoose.model('SubSection', subSectionSchema) 