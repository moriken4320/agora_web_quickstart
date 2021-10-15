<template>
  <div>
    <div class="d-flex">
      <!-- Video Element -->
      <div :id="videoElementId" class="video"></div>
      <!-- /Video Element -->
      <!-- Share Screen Element -->
      <div
        v-show="rtc.localScreenTrack !== null"
        :id="shareScreenElementId"
        class="share-screen"
      ></div>
      <!-- /Share Screen Element -->
    </div>

    <div class="button-group mt-2">
      <!-- Publish ON/OFF Button -->
      <button
        v-if="!isLiveState.finish"
        @click="isPublishing ? unPublish() : publish()"
        type="button"
        class="btn btn-sm"
        :class="isPublishing ? 'btn-danger' : 'btn-primary'"
        :disabled="isLiveState.finish"
      >
        {{ isPublishing ? "Get unPublish" : "Get Publish" }}
        {{
          !isPublishing && isLiveState.start && !isLiveState.finish
            ? "再配信"
            : ""
        }}
      </button>
      <div v-else>配信終了</div>
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

      <!-- Share Screen Button -->
      <button
        @click="
          rtc.localScreenTrack !== null ? stopShareScreen() : startShareScreen()
        "
        type="button"
        class="btn btn-sm"
        :class="rtc.localScreenTrack !== null ? 'btn-danger' : 'btn-primary'"
      >
        {{
          rtc.localScreenTrack !== null
            ? "Stop Share Screen"
            : "Start Share Screen"
        }}
      </button>
      <!-- /Share Screen Button -->

      <!-- Audio Devices Select Button -->
      <div class="dropdown mt-2 d-flex">
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
            @click="resetAudioDevice(audioDevice.deviceId)"
          >
            {{ audioDevice.label }}
          </li>
        </ul>
        <div>{{ setMicDeviceLabel }}</div>
      </div>
      <!-- /Audio Devices Select Button -->

      <!-- Video Devices Select Button -->
      <div class="dropdown mt-2 d-flex">
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
            @click="resetVideoDevice(videoDevice.deviceId)"
          >
            {{ videoDevice.label }}
          </li>
        </ul>
        <div>{{ setCameraDeviceLabel }}</div>
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
    liveStartFlagFromServer: {
      type: Boolean,
      required: true,
      default: false,
    },
    liveFinishFlagFromServer: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  data() {
    return {
      audioDevices: null,
      videoDevices: null,
      videoElementId: "video",
      shareScreenElementId: "share-screen",
      isPublishing: false,
      rtc: {
        localAudioTrack: null,
        localVideoTrack: null,
        client: null,
        shareScreenClient: null,
        localScreenTrack: null,
      },
      isLiveState: {
        start: false,
        finish: false,
      },
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
  computed: {
    setMicDeviceLabel() {
      return this.rtc.localAudioTrack?.getTrackLabel() ?? "-";
    },
    setCameraDeviceLabel() {
      return this.rtc.localVideoTrack?.getTrackLabel() ?? "-";
    },
  },
  created() {
    this.isLiveState.start = this.liveStartFlagFromServer;
    this.isLiveState.finish = this.liveFinishFlagFromServer;
  },
  async mounted() {
    try {
      AgoraHelper.setupAgoraRTC();

      await this.setUpLocalTracks();

      AgoraRTC.onMicrophoneChanged = () => this.onMicrophoneChanged();
      AgoraRTC.onCameraChanged = () => this.onCameraChanged();

      this.rtc.client = await AgoraHelper.createClient();
      this.rtc.client.on("network-quality", (status) => {
        this.getStatus(status);
      });
      await this.rtc.client.setClientRole("host");
      //   this.rtc.client.on("connection-state-change", (curState, revState, reason) => {
      //       console.log(curState, revState, reason);
      //       revState !== curState && curState === "RECONNECTING" && reason !== "LEAVE" ? this.handleFail(new AgoraError(reason)) : null;
      //   });
      await this.rtc.localVideoTrack?.play(this.videoElementId);

      await AgoraHelper.setupClientAsync(
        this.rtc.client,
        this.appid,
        this.channel,
        this.token,
        this.uid
      );
    } catch (error) {
      this.handleFail(error);
      return;
    }
  },
  methods: {
    /**
     * エラーチェック用
     */
    handleFail(err) {
      err !== null ? console.error(err) : null;
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
        throw null;
      }
    },
    /**
     * ローカルトラックのセットアップ（デフォルトデバイスでトラックを作成）
     */
    async setUpLocalTracks() {
      try {
        await this.loadDevices();

        [
          this.rtc.localAudioTrack,
          this.rtc.localVideoTrack,
        ] = await AgoraHelper.createMicrophoneAndCameraTracks(
          this.audioDevices[0].deviceId,
          this.videoDevices[0].deviceId
        );
      } catch (error) {
        this.handleFail(error);
        throw null;
      }
    },
    /**
     * 取得可能なオーディオデバイスに変化があった時に実行
     */
    async onMicrophoneChanged() {
      await this.loadDevices();
      this.resetAudioDevice();
    },
    /**
     * 取得可能なビデオデバイスに変化があった時に実行
     */
    async onCameraChanged() {
      await this.loadDevices();
      this.resetVideoDevice();
    },
    /**
     * オーディオデバイスを再設定
     */
    async resetAudioDevice(deviceId = undefined) {
      const selectedAudio = this.audioDevices.find(
        (device) => device.deviceId === deviceId
      );
      await this.rtc.localAudioTrack.setDevice(
        selectedAudio?.deviceId ?? this.audioDevices[0].deviceId
      );
      console.log(
        "reset audio-device:[" + this.rtc.localAudioTrack.getTrackLabel() + "]"
      );
    },
    /**
     * ビデオデバイスを再設定
     */
    async resetVideoDevice(deviceId = undefined) {
      const selectedVideo = this.videoDevices.find(
        (device) => device.deviceId === deviceId
      );
      await this.rtc.localVideoTrack.setDevice(
        selectedVideo?.deviceId ?? this.videoDevices[0].deviceId
      );
      console.log(
        "reset video-device:[" + this.rtc.localVideoTrack.getTrackLabel() + "]"
      );
    },
    /**
     * 配信開始する
     * @returns {void}
     */
    async publish() {
      if (this.isLiveState.finish) {
        return;
      }

      try {
        await this.rtc.client.publish([
          this.rtc.localAudioTrack,
          this.rtc.localVideoTrack,
        ]);

        await this.rtc.shareScreenClient?.publish(this.rtc.localScreenTrack);

        this.isPublishing = true;
        console.log("publish success");

        if (!this.isLiveState.start) {
          // TODO::ここにserverへ配信開始フラグをたたせるリクエストを記述する

          this.isLiveState.start = true;
          console.log("配信開始");
        }
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
        await this.rtc.shareScreenClient?.unpublish(this.rtc.localScreenTrack);
        console.log("unPublish success");

        this.isPublishing = false;
        this.statuses.network = AgoraHelper.networkStatues.DISCONNECTED;

        if (!this.isLiveState.finish) {
          // TODO::ここにserverへ配信終了フラグをたたせるリクエストを記述する

          this.isLiveState.finish = true;
          console.log("配信終了");
        }
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
      if (!this.rtc.localAudioTrack?.muted) {
        this.statuses.volumeLevel = this.rtc.localAudioTrack?.getVolumeLevel();
      } else {
        // ミュートしている場合は０
        this.statuses.volumeLevel = 0;
      }

      // 他のステータスはpublishしてから取得開始したいため、falseの場合ここでリターン
      if (!this.isPublishing) {
        return false;
      }

      // ネットワーク状態
      this.statuses.network = AgoraHelper.convertNetworkStatus(
        status.uplinkNetworkQuality
      );
      // ビデオビットレート
      this.statuses.videoBitrate = this.rtc.client?.getLocalVideoStats().sendBitrate;
      // オーディオビットレート
      this.statuses.audioBitrate = this.rtc.client?.getLocalAudioStats().sendBitrate;
      // フレームレート
      this.statuses.framerate = this.rtc.client?.getLocalVideoStats().sendFrameRate;
      // 送信データ総量
      this.statuses.sendTotalData = this.rtc.client?.getRTCStats().SendBytes;
      // パケットロス率
      this.statuses.packetLossRate = this.rtc.client?.getLocalVideoStats().currentPacketLossRate;
    },
    /**
     * 画面共有を開始
     */
    async startShareScreen() {
      try {
        this.rtc.shareScreenClient = await AgoraHelper.createClient();
        await this.rtc.shareScreenClient.setClientRole("host");
        await AgoraHelper.setupClientAsync(
          this.rtc.shareScreenClient,
          this.appid,
          this.channel,
          this.token,
          null
        );

        this.rtc.localScreenTrack = await AgoraHelper.createScreenVideoTrack();

        await this.rtc.localScreenTrack?.play(this.shareScreenElementId);
        this.rtc.localScreenTrack?.once("track-ended", () =>
          this.stopShareScreen()
        );

        if (this.isPublishing) {
          await this.rtc.shareScreenClient?.publish(this.rtc.localScreenTrack);
        }

        console.log("start share screen success");
      } catch (error) {
        this.stopShareScreen();
        return;
      }
    },
    /**
     * 画面共有を停止
     */
    async stopShareScreen() {
      await this.rtc.localScreenTrack?.close();
      this.rtc.localScreenTrack = null;

      await this.rtc.shareScreenClient?.leave();
      this.rtc.shareScreenClient = null;

      console.log("stop share screen success");
    },
  },
};
</script>

<style scope>
.video,
.share-screen {
  width: 640px;
  height: 480px;
  background-color: black;
}
</style>
