import AgoraRTC from "agora-rtc-sdk-ng";
import { AgoraError } from "./error";
import { DeviceManager } from "./device";

const AgoraHelper = {
  /**
   * agoraRTCのセットアップ
   */
  setupAgoraRTC() {
    AgoraRTC.setLogLevel(2);
    this.checkSystemRequirements();
  },
  /**
   * Webブラウザと互換性があるか確認
   */
  checkSystemRequirements() {
    if (!AgoraRTC.checkSystemRequirements()) {
      throw new AgoraError(
        "現在利用しているブラウザはサポートされていません。"
      );
    }
  },
  /**
   * サポートしているコーデックを取得
   */
  getSupportedCodec() {
    return new Promise((resolve, reject) => {
      AgoraRTC.getSupportedCodec().then(
        (result) => {
          if (result.video.length > 0) {
            resolve(result.video[0].toLowerCase());
          } else {
            reject(
              new AgoraError(
                "現在利用しているブラウザはサポートされていません。",
                err
              )
            );
          }
        },
        (err) => reject(err)
      );
    });
  },
  /**
   * クライアントを作成
   * @returns {Client}
   */
  async createClient() {
    const supportedCodec = await this.getSupportedCodec();
    return AgoraRTC.createClient({
      mode: "live",
      codec: supportedCodec,
    });
  },
  /**
   * マイクとカメラのトラックを作成
   * @returns {Promise<LocalTracks[] | void>}
   */
  createMicrophoneAndCameraTracks(
    microphoneId = undefined,
    cameraId = undefined
  ) {
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
      }
    );
  },
  /**
   * デバイスの利用権限をチェック
   * @return {Promise<LocalTrack[] | void>}
   */
  checkDevicePermission() {
    return this.createMicrophoneAndCameraTracks().catch((error) => {
      if (error.code === "PERMISSION_DENIED") {
        throw new AgoraError(
          "カメラとマイクの許可がされていません。\nブラウザの設定を変更し、画面を更新してください。",
          error
        );
      }
    });
  },
  /**
   * 接続されているマイクデバイス情報を取得
   * @returns {Promise<MediaDeviceInfo[]>}
   */
  async getMicDevicesAsync() {
    const devices = await AgoraRTC.getDevices();
    const micDevices = devices.filter(
      (device) => device.kind === "audioinput" && device.deviceId !== "default"
    );
    if (micDevices.length === 0) {
      throw new AgoraError(
        "マイクが接続されていません。接続し直した後、画面を更新してください",
        null
      );
    }
    return micDevices;
  },
  /**
   * 接続されているカメラデバイス情報を取得
   * @returns {Promise<MediaDeviceInfo[]>}
   */
  async getVideoDevicesAsync() {
    const devices = await AgoraRTC.getDevices();
    const videoDevices = devices.filter(
      (device) => device.kind === "videoinput"
    );
    if (videoDevices.length === 0) {
      throw new AgoraError(
        "カメラが接続されていません。接続し直した後、画面を更新してください",
        null
      );
    }
    return videoDevices;
  },
  /**
   * @return {Promise<[MediaDeviceInfo[], MediaDeviceInfo[]]>}
   */
  async getVideoAndMicDevicesAsync() {
    const getMicsPromise = AgoraHelper.getMicDevicesAsync();
    const getVideosPromise = AgoraHelper.getVideoDevicesAsync();
    const results = await Promise.allSettled([
      getMicsPromise,
      getVideosPromise,
    ]);
    const rejects = results.filter((result) => result.status === "rejected");
    if (rejects.length !== 0) {
      const errors = rejects.map((result) => result.reason);
      const message = errors.map((error) => error.message).join("\n");
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
    const configuredMicDeviceId = localStorage.getItem("mic");
    const selectedAudio = audioDevices.find(
      (device) => device.deviceId === configuredMicDeviceId
    );
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
    const selectedVideo = videoDevices.find(
      (device) => device.deviceId === configuredVideo1DeviceId
    );
    const deviceId = selectedVideo?.deviceId ?? defaultId;
    if (deviceId !== configuredVideo1DeviceId) {
      DeviceManager.saveVideo1Setting(deviceId, 0);
    }
    return deviceId;
  },

  /**
   * ネットワーク状況を表す文言リスト
   */
  networkStatues: {
    UNKNOWN: "不明",
    EXCELLENT: "良好",
    BAD: "不安定",
    DISCONNECTED: "切断",
  },
  /**
   * APIで取得したネットワーク状況番号を文言に変換しリターン
   * @param statusNumber {object}
   * @returns {string}
   */
  convertNetworkStatus(statusNumber) {
    switch (statusNumber) {
      case 0:
        return this.networkStatues.UNKNOWN;
      case 1:
        return this.networkStatues.EXCELLENT;
      case 6:
        return this.networkStatues.DISCONNECTED;
      default:
        return this.networkStatues.BAD;
    }
  },

  /**
   * チャンネルへの入室
   * @param client
   * @param appid
   * @param channel
   * @param token
   * @param uid
   * @return {Promise<unknown>}
   */
  joinChannelAsync(client, appid, channel, token, uid) {
    return client
      .join(appid, channel, token, uid)
      .then(() => {
        console.log("join success");
      })
      .catch((err) => {
        throw new AgoraError(
          "入室処理に失敗しました。ブラウザを更新して再度入室してみてください",
          err
        );
      });
  },

  /**
   * @param client
   * @returns {Promise<void>}
   */
  enableDualStreamAsync(client) {
    return client.enableDualStream().catch(() => {
      throw new AgoraError(
        "通信エラーが発生しました。ブラウザを更新して再度入室してみてください",
        err
      );
    });
  },

  /**
   * AgoraClientのセットアップ
   * @param client
   * @param appid
   * @param channel
   * @param token
   * @param uid
   * @param isNotSetLowStream
   * @returns {Promise<void>}
   */
  async setupClientAsync(
    client,
    appid,
    channel,
    token,
    uid,
    isNotSetLowStream = false
  ) {
    await this.joinChannelAsync(client, appid, channel, token, uid);
    await this.enableDualStreamAsync(client);
    if (!isNotSetLowStream) {
      client.setLowStreamParameter({
        bitrate: 1000,
        framerate: 30,
        height: 480,
        width: 640,
      });
    }
  },
};

export default AgoraHelper;
