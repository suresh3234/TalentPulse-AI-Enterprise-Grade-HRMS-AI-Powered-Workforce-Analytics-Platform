import { useEffect, useRef, useState } from "react";
import { getSocket } from "../../utils/socket";
import toast from "react-hot-toast";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

/**
 * Custom hook to handle 1v1 WebRTC connection and audio/video controls
 * @param {string} roomId - Room identifier for signaling
 * @param {string} userId - User identifier (e.g., candidateId or HR ID)
 */
export default function useWebRTC(roomId, userId) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState("disconnected");
  
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!roomId || !userId) return;

    socketRef.current = getSocket();
    const socket = socketRef.current;

    // 1. Initialize local video/audio devices
    const initializeDevices = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: 24 },
          audio: true,
        });
        localStreamRef.current = stream;
        setLocalStream(stream);

        // Join room to alert other peer
        socket.emit("join-room", { roomId, userId });
        setConnectionState("connecting");
      } catch (err) {
        loggerError("Webcam/Mic permission denied.", err);
        toast.error("Please grant camera and microphone access to join the interview.");
      }
    };

    initializeDevices();

    // 2. Peer join event -> initiate WebRTC call (offer)
    socket.on("user-joined", async ({ userId: joinedUserId }) => {
      toast.success("Peer connected. Calibrating channels...");
      try {
        await createPeerConnection(joinedUserId);
        
        // Offer initiation
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);
        
        socket.emit("signal", {
          roomId,
          signal: { type: "offer", sdp: offer.sdp },
          senderId: userId,
        });
      } catch (err) {
        loggerError("Error handling user-joined:", err);
      }
    });

    // 3. Handle signal messages
    socket.on("signal", async ({ signal, senderId }) => {
      try {
        if (!peerConnectionRef.current) {
          await createPeerConnection(senderId);
        }

        if (signal.type === "offer") {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription({ type: "offer", sdp: signal.sdp })
          );
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);

          socket.emit("signal", {
            roomId,
            signal: { type: "answer", sdp: answer.sdp },
            senderId: userId,
          });
        } else if (signal.type === "answer") {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription({ type: "answer", sdp: signal.sdp })
          );
        } else if (signal.type === "candidate") {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(signal.candidate)
          );
        }
      } catch (err) {
        loggerError("Error processing signal:", err);
      }
    });

    return () => {
      cleanupConnection();
    };
  }, [roomId, userId]);

  const createPeerConnection = async (partnerId) => {
    if (peerConnectionRef.current) return;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    // Add local tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Capture remote stream
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        setConnectionState("connected");
      }
    };

    // Forward ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("signal", {
          roomId,
          signal: { type: "candidate", candidate: event.candidate },
          senderId: userId,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setConnectionState("connected");
      } else if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        setConnectionState("failed");
        toast.error("WebRTC connection lost.");
      }
    };
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStreamRef.current = screenStream;

        const videoTrack = screenStream.getVideoTracks()[0];
        
        // Replace video track in peer connection
        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === "video");
          if (videoSender) {
            videoSender.replaceTrack(videoTrack);
          }
        }

        // When user stops screen sharing via browser native bar
        videoTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
        toast.success("Screen sharing activated.");
      } catch (err) {
        loggerError("Screen share cancelled.", err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current) {
      const originalVideoTrack = localStreamRef.current.getVideoTracks()[0];
      if (peerConnectionRef.current && originalVideoTrack) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === "video");
        if (videoSender) {
          videoSender.replaceTrack(originalVideoTrack);
        }
      }
    }

    setIsScreenSharing(false);
    toast.success("Returned to camera view.");
  };

  const cleanupConnection = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState("disconnected");
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
  };

  const loggerError = (msg, err) => {
    console.error(`[WebRTC] ${msg}`, err);
  };

  return {
    localStream,
    remoteStream,
    connectionState,
    isMuted,
    isCameraOff,
    isScreenSharing,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    endCall: cleanupConnection,
  };
}
