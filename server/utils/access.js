const mongoose = require('mongoose');
const Channel = require('../models/Channel');

/**
 * Returns the channel document if userId is a member, otherwise null.
 */
async function getMemberChannel(channelId, userId) {
  if (!mongoose.isValidObjectId(channelId)) return null;
  const channel = await Channel.findById(channelId).select(
    'name isDM isBroadcast memberIds createdBy'
  );
  if (!channel) return null;
  const isMember = channel.memberIds.some((id) => id.toString() === String(userId));
  return isMember ? channel : null;
}

/**
 * Emit only to the members' personal rooms. NEVER use io.emit() for chat data.
 */
function emitToMembers(io, channel, event, payload) {
  if (!channel || !Array.isArray(channel.memberIds)) return;
  channel.memberIds.forEach((id) => {
    const memberIdStr = typeof id === 'object' ? id._id?.toString() || id.toString() : id.toString();
    io.to(`user:${memberIdStr}`).emit(event, payload);
  });
}

module.exports = { getMemberChannel, emitToMembers };
