/**
 * socket.js — Frontend Socket.IO singleton
 *
 * Connects to the backend only once per app session.
 * After connecting, the user joins their private room using their userId,
 * so the backend can emit targeted events to them.
 */

import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let socket = null;

/**
 * Returns the active socket instance, creating it if it doesn't exist yet.
 */
export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
};

/**
 * Connects the socket and joins the user's private room.
 * Call this once after the user logs in.
 * @param {string} userId - MongoDB _id of the logged-in user
 */
export const connectSocket = (userId) => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  s.emit("join", userId);
};

/**
 * Disconnects and destroys the socket.
 * Call this on logout.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
