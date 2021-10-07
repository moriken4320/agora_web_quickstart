import AgoraRTC from "agora-rtc-sdk-ng";
import { AgoraError } from './error';


const AgoraHelper = {
    /**
     * agoraRTCのセットアップを行います
     */
    setupAgoraRTC() {
        AgoraRTC.setLogLevel(2);
    },
    /**
     * クライアントを作成します
     * @param secretKey {string} agoraの映像通信暗号化用の秘密鍵
     * @returns {Client}
     */
    createClient(secretKey) {
        const client = AgoraRTC.createClient({
        mode: 'live',
        codec: 'vp8',
        });
        client.setEncryptionConfig('aes-128-xts', secretKey);
        return client;
    },
};

export default AgoraHelper;