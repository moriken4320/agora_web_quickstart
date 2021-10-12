<template>
  <div>
    <div
      :id="videoContainerId"
      style="width: 640px; height:480px; background-color: black;"
    ></div>
    <div class="button-group">
      <button
        @click="isPublished ? unPublish() : publish()"
        type="button"
        class="btn btn-sm"
        :class="isPublished ? 'btn-danger' : 'btn-primary'"
      >
        {{ isPublished ? "Get unPublish" : "Get Publish" }}
      </button>
      <button
        @click="setAudioMuted()"
        type="button"
        class="btn btn-sm"
        :class="
          rtc.localAudioTrack !== null && rtc.localAudioTrack.muted
            ? 'btn-danger'
            : 'btn-primary'
        "
      >
        {{
          rtc.localAudioTrack !== null && rtc.localAudioTrack.muted
            ? "Audio Muted Now"
            : "Audio No Muted"
        }}
      </button>
    </div>
    <br />
    <div>
      <ul>
        <li>ボリュームレベル：{{ statuses.volumeLevel }}</li>
        <li>接続状態：{{ statuses.network }}</li>
        <li>ビデオビットレート：{{ statuses.videoBitrate }}</li>
        <li>オーディオビットレート：{{ statuses.audioBitrate }}</li>
        <li>フレームレート：{{ statuses.framerate }}</li>
        <li>送信データ総量：{{ statuses.sendTotalData }} bytes</li>
        <li>パケットロス率：{{ statuses.packetLossRate }}</li>
      </ul>
    </div>
  </div>
</template>

<script>
import AgoraRTC from "agora-rtc-sdk-ng";
import AgoraHelper from "../agora/agora.js";
import { AgoraError } from "../agora/error.js";
import $ from "jquery";

export default {
  props: {
    appid: {
      type: String,
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    channel: {
      type: String,
      default: "test",
    },
    uid: {
      type: Number,
      default: 222222,
    },
  },
  data() {
    return {
      audioDevices: null,
      videoDevices: null,
      videoContainerId: "video",
      rtc: {
        localAudioTrack: null,
        localVideoTrack: null,
        client: null,
        microphoneId: null,
        cameraId: null,
      },
      isPublished: false,
      statuses: {
        volumeLevel: 0,
        network: "-",
        videoBitrate: 0,
        audioBitrate: 0,
        framerate: 0,
        sendTotalData: 0,
        packetLossRate: 0,
      },
    };
  },
  async mounted() {
    AgoraHelper.setupAgoraRTC();

    // -----------デバイス読み込み処理ここから-----------
    try {
      await AgoraHelper.checkDevicePermission();
      [
        this.audioDevices,
        this.videoDevices,
      ] = await AgoraHelper.getVideoAndMicDevicesAsync();
      this.rtc.microphoneId = AgoraHelper.getConfiguredAudioDeviceId(
        this.audioDevices,
        ""
      );
      this.rtc.cameraId = AgoraHelper.getConfiguredVideoDeviceId(
        this.videoDevices,
        ""
      );
      [
        this.rtc.localAudioTrack,
        this.rtc.localVideoTrack,
      ] = await AgoraHelper.createMicrophoneAndCameraTracks(
        this.rtc.microphoneId,
        this.rtc.cameraId
      );
    } catch (error) {
      this.handleFail(error);
      return;
    }
    // -----------デバイス読み込み処理ここまで-----------

    this.rtc.client = AgoraHelper.createClient();
    this.rtc.client.setClientRole("host");
    await this.rtc.localVideoTrack.play(this.videoContainerId);

    this.rtc.client.on("network-quality", (status) => {
      this.getStatus(status);
    });

    await this.rtc.client.join(this.appid, this.channel, this.token, this.uid);
    console.log("join success");
  },
  methods: {
    /**
     * エラーチェック用
     */
    handleFail(err) {
      console.error(err);
      if (err instanceof AgoraError) {
        alert(err.message);
        return;
      }
    },
    /**
     * 配信開始する
     * @returns {void}
     */
    async publish() {
      try {
        await this.rtc.client.publish([
          this.rtc.localAudioTrack,
          this.rtc.localVideoTrack,
        ]);
        console.log("publish success");

        this.isPublished = true;
      } catch (error) {
        this.handleFail(error);
        return;
      }
    },
    /**
     * 配信を終了する
     * @returns {void}
     */
    async unPublish() {
      try {
        await this.rtc.client.unpublish([
          this.rtc.localAudioTrack,
          this.rtc.localVideoTrack,
        ]);
        console.log("unPublish success");

        this.isPublished = false;
        this.statuses.network = AgoraHelper.networkStatues.OFFLINE;
      } catch (error) {
        this.handleFail(error);
        return;
      }
    },
    /**
     * オーディオのON/OFF切り替え
     * @returns {void}
     */
    async setAudioMuted() {
      const reverseResult = !this.rtc.localAudioTrack?.muted;
      await this.rtc.localAudioTrack?.setMuted(reverseResult);
      console.log("success audio muted " + reverseResult);
    },
    /**
     * 各ステータスを取得
     * @param status {object}
     */
    getStatus(status) {
      // オーディオボリューム
      if (!this.rtc.localAudioTrack.muted) {
          this.statuses.volumeLevel = this.rtc.localAudioTrack.getVolumeLevel();
      } else { // ミュートしている場合は０
          this.statuses.volumeLevel = 0;
      }

      // 他のステータスはpublishしてから取得開始のため、falseの場合ここでリターン
      if (!this.isPublished) {
        return false;
      }

        // ネットワーク状態
      this.statuses.network = AgoraHelper.convertNetworkStatus(
        status.uplinkNetworkQuality
      );
      // ビデオビットレート
      this.statuses.videoBitrate = this.rtc.client.getLocalVideoStats().sendBitrate;
      // オーディオビットレート
      this.statuses.audioBitrate = this.rtc.client.getLocalAudioStats().sendBitrate;
      // フレームレート
      this.statuses.framerate = this.rtc.client.getLocalVideoStats().sendFrameRate;
      // 送信データ総量
      this.statuses.sendTotalData = this.rtc.client.getRTCStats().SendBytes;
      // パケットロス率
      this.statuses.packetLossRate = this.rtc.client.getLocalVideoStats().currentPacketLossRate;
    },
  },
};
</script>
