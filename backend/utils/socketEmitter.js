/**
 * socketEmitter.js
 * 
 * A singleton helper that holds a reference to the Socket.IO server instance.
 * Controllers call emitToUser() to push real-time events to specific user rooms.
 * The io reference is set once at server startup via setIo().
 */

let _io = null;

/**
 * Stores the Socket.IO server instance. Called once in server.js after io is created.
 * @param {import('socket.io').Server} io
 */
const setIo = (io) => {
  _io = io;
};

/**
 * Emits an event to a specific user's private socket room.
 * @param {string} userId - The MongoDB user _id string
 * @param {string} event  - The socket event name (e.g. 'notification')
 * @param {object} payload - The data to send
 */
const emitToUser = (userId, event, payload) => {
  if (_io && userId) {
    _io.to(`user:${userId}`).emit(event, payload);
  }
};

/**
 * Broadcasts an event to all connected clients.
 * @param {string} event
 * @param {object} payload
 */
const broadcast = (event, payload) => {
  if (_io) {
    _io.emit(event, payload);
  }
};

module.exports = { setIo, emitToUser, broadcast };
