import AgoraRTC from "agora-rtc-sdk-ng";
import { AgoraError } from './error';
import { DeviceManager } from './device';


const AgoraHelper = {
    /**
     * agoraRTCのセットアップ
     */
    setupAgoraRTC() {
        AgoraRTC.setLogLevel(2);
    },
    /**
     * クライアントを作成
     * @returns {Client}
     */
    createClient() {
        return AgoraRTC.createClient({
        mode: 'live',
        codec: 'vp8',
        });
    },
    /**
     * マイクとカメラのトラックを作成
     * @returns {Promise<LocalTracks[] | void>}
     */
     createMicrophoneAndCameraTracks(microphoneId = undefined, cameraId = undefined) {
        return AgoraRTC.createMicrophoneAndCameraTracks(
           {
               AEC: true,
               AGC: true,
               ANS: true,
               microphoneId: microphoneId,
           },
           {
                encoderConfig: "720p_2",
                cameraId: cameraId,
           }, 
        );
   },
    /**
     * デバイスの利用権限をチェック
     * @return {Promise<LocalTrack[] | void>}
     */
    checkDevicePermission() {
        return this.createMicrophoneAndCameraTracks()
        .catch((error) => {
            if (error.code === 'PERMISSION_DENIED') {
                throw new AgoraError('カメラとマイクの許可がされていません。\nブラウザの設定を変更し、画面を更新してください。', error);
            }
        });
    },
    /**
     * 接続されているマイクデバイス情報を取得
     * @returns {Promise<MediaDeviceInfo[]>}
     */
    async getMicDevicesAsync() {
        const devices = await AgoraRTC.getDevices();
        const micDevices = devices.filter((device) => device.kind === 'audioinput');
        if (micDevices.length === 0) {
        throw new AgoraError('マイクが接続されていません。接続し直した後、画面を更新してください', null);
        }
        return micDevices;
    },
    /**
     * 接続されているカメラデバイス情報を取得
     * @returns {Promise<MediaDeviceInfo[]>}
     */
    async getVideoDevicesAsync() {
        const devices = await AgoraRTC.getDevices();
        const videoDevices = devices.filter((device) => device.kind === 'videoinput');
        if (videoDevices.length === 0) {
        throw new AgoraError('カメラが接続されていません。接続し直した後、画面を更新してください', null);
        }
        return videoDevices;
    },
    /**
     * @return {Promise<[MediaDeviceInfo[], MediaDeviceInfo[]]>}
     */
    async getVideoAndMicDevicesAsync() {
        const getMicsPromise = AgoraHelper.getMicDevicesAsync();
        const getVideosPromise = AgoraHelper.getVideoDevicesAsync();
        const results = await Promise.allSettled([getMicsPromise, getVideosPromise]);
        const rejects = results.filter((result) => result.status === 'rejected');
        if (rejects.length !== 0) {
            const errors = rejects.map((result) => result.reason);
            const message = errors.map((error) => error.message).join('\n');
            throw new AgoraError(message, errors);
        }
        const devices = results.map((result) => result.value);
        const micDevices = devices[0];
        const videoDevices = devices[1];
        return [micDevices, videoDevices];
    },
    /**
     * 設定済みのマイクのデバイスIDを取得します
     * @param audioDevices {MediaDeviceInfo[]}
     * @param defaultId {string}
     * @returns {string}
     */
    getConfiguredAudioDeviceId(audioDevices, defaultId) {
        const configuredMicDeviceId = localStorage.getItem('mic');
        const selectedAudio = audioDevices.find((device) => device.deviceId === configuredMicDeviceId);
        const deviceId = selectedAudio?.deviceId ?? defaultId;
        if (deviceId !== configuredMicDeviceId) {
            DeviceManager.saveMicSetting(deviceId, 0);
        }
        return deviceId;
    },

    /**
     * 設定済みのカメラのデバイスIDを取得します。(
     * @param videoDevices {MediaDeviceInfo[]}
     * @param defaultId {string}
     */
    getConfiguredVideoDeviceId(videoDevices, defaultId) {
        const configuredVideo1DeviceId = DeviceManager.getConfiguredVideo1DeviceId();
        const selectedVideo = videoDevices.find((device) => device.deviceId === configuredVideo1DeviceId);
        const deviceId = selectedVideo?.deviceId ?? defaultId;
        if (deviceId !== configuredVideo1DeviceId) {
            DeviceManager.saveVideo1Setting(deviceId, 0);
        }
        return deviceId;
    },
};

export default AgoraHelper;