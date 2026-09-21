const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema(
  {
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      default: null,
    },
    roomCode: {
      type: String,
      default: '',
    },
    callType: {
      type: String,
      enum: ['video', 'audio'],
      default: 'video',
    },
    status: {
      type: String,
      enum: ['completed', 'missed', 'declined', 'no_answer', 'active'],
      default: 'completed',
    },
    duration: {
      type: String,
      default: '00:00',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CallLog', callLogSchema);
