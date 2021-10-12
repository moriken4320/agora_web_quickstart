<template>
  <div>
    <!-- Video Container -->
    <div
      :id="videoContainerId"
      class="video"
    ></div>
    <!-- /Video Container -->

    <div class="button-group mt-2">
      <!-- Publish ON/OFF Button -->
      <button
        @click="isPublished ? unPublish() : publish()"
        type="button"
        class="btn btn-sm"
        :class="isPublished ? 'btn-danger' : 'btn-primary'"
        :disabled="!isPublishable"
      >
        {{ isPublished ? "Get unPublish" : "Get Publish" }}
      </button>
      <!-- /Publish ON/OFF Button -->

      <!-- Audio Mute Button -->
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
      <!-- /Audio Mute Button -->

      <!-- Video Mute Button -->
      <button
        @click="setVideoMuted()"
        type="button"
        class="btn btn-sm"
        :class="
          rtc.localVideoTrack !== null && rtc.localVideoTrack.muted
            ? 'btn-danger'
            : 'btn-primary'
        "
      >
        {{
          rtc.localVideoTrack !== null && rtc.localVideoTrack.muted
            ? "Video Muted Now"
            : "Video No Muted"
        }}
      </button>
      <!-- /Video Mute Button -->

      <!-- Audio Devices Select Button -->
      <div class="dropdown mt-2">
        <button
          class="btn btn-secondary dropdown-toggle"
          type="button"
          id="dropdownMenuButton"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          音声入力ソース
        </button>
        <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
          <li
            v-for="audioDevice in audioDevices"
            :key="audioDevice.deviceId"
            class="px-3 py-1"
          >
            {{ audioDevice.label }}
          </li>
        </ul>
      </div>
      <!-- /Audio Devices Select Button -->

      <!-- Video Devices Select Button -->
      <div class="dropdown mt-2">
        <button
          class="btn btn-secondary dropdown-toggle"
          type="button"
          id="dropdownMenuButton"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          映像入力ソース
        </button>
        <ul class="dropdown-menu" aria-labelledby="dropdownMenuButton">
          <li
            v-for="videoDevice in videoDevices"
            :key="videoDevice.deviceId"
            class="px-3 py-1"
          >
            {{ videoDevice.label }}
          </li>
        </ul>
      </div>
      <!-- /Video Devices Select Button -->
    </div>
    <br />

    <!-- All Status -->
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
    <!-- /All Status -->
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
        role: null,
        microphoneId: null,
        cameraId: null,
      },
      isPublished: false,
      isPublishable: true,
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

    await this.setUpLocalTracks();

    this.rtc.client = await AgoraHelper.createClient();
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
     * 利用可能デバイス情報を取得
     */
    async loadDevices() {
      try {
        await AgoraHelper.checkDevicePermission();
        [
          this.audioDevices,
          this.videoDevices,
        ] = await AgoraHelper.getVideoAndMicDevicesAsync();
      } catch (error) {
        this.handleFail(error);
        return;
      }
    },
    /**
     * ローカルトラックのセットアップ（デフォルトデバイスでトラックを作成）
     */
    async setUpLocalTracks() {
      try {
        await this.loadDevices();

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
    },
    /**
     * 配信開始する
     * @returns {void}
     */
    async publish() {
      try {
        this.rtc.role === null
          ? (this.rtc.role = await this.rtc.client.setClientRole("host"))
          : null;

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
        this.isPublishable = false;
        this.statuses.network = AgoraHelper.networkStatues.OFFLINE;

        await this.rtc.client.leave();
        console.log("leave success");
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
     * ビデオのON/OFF切り替え
     * @returns {void}
     */
    async setVideoMuted() {
      const reverseResult = !this.rtc.localVideoTrack?.muted;
      await this.rtc.localVideoTrack?.setMuted(reverseResult);
      console.log("success video muted " + reverseResult);
    },
    /**
     * 各ステータスを取得
     * @param status {object}
     */
    getStatus(status) {
      // オーディオボリューム
      if (!this.rtc.localAudioTrack.muted) {
        this.statuses.volumeLevel = this.rtc.localAudioTrack.getVolumeLevel();
      } else {
        // ミュートしている場合は０
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

<style scope>
.video {
    width: 640px; 
    height:480px; 
    background-color: black;
}
</style>