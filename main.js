let localStream;
let peerConnection;
let socket;
let roomId;

// 初始化 Socket.io 连接
socket = io();

// WebRTC 配置
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

// 初始化本地视频流
async function initLocalStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        document.getElementById('localVideo').srcObject = localStream;
    } catch (err) {
        console.error('无法访问摄像头或麦克风:', err);
        alert('无法访问摄像头或麦克风');
    }
}

// 创建对等连接
async function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    // 添加本地流
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // 处理远程流
    peerConnection.ontrack = (event) => {
        document.getElementById('remoteVideo').srcObject = event.streams[0];
    };

    // 处理 ICE 候选
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { candidate: event.candidate, roomId });
        }
    };
}

// 开始通话
async function startCall() {
    if (!localStream) {
        await initLocalStream();
    }

    roomId = Math.random().toString(36).substr(2, 9);
    await createPeerConnection();

    // 创建并发送提议
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { offer, roomId });

    socket.emit('join-room', roomId);
    alert(`房间号: ${roomId}`);
}

// 事件监听
document.getElementById('startBtn').onclick = startCall;
document.getElementById('muteBtn').onclick = () => {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    document.getElementById('muteBtn').textContent = 
        audioTrack.enabled ? '静音' : '取消静音';
};

document.getElementById('videoBtn').onclick = () => {
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    document.getElementById('videoBtn').textContent = 
        videoTrack.enabled ? '关闭视频' : '开启视频';
};

document.getElementById('endBtn').onclick = () => {
    if (peerConnection) {
        peerConnection.close();
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    window.location.reload();
};

// 初始化
initLocalStream(); 