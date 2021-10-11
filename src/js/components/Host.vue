<template>
  <div>
    <div
      :id="videoContainerId"
      style="width: 640px; height:480px; background-color: black;"
    ></div>
    <div class="button-group">
      <button
        v-if="!isPublished"
        @click="publish()"
        type="button"
        class="btn btn-primary btn-sm"
      >
        Publish
      </button>
      <button
        v-else
        @click="unPublish()"
        type="button"
        class="btn btn-danger btn-sm"
      >
        unPublish
      </button>
    </div>
    <br />
    <div>
      <ul>
        <li>接続状態：{{ networkStatus }}</li>
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
      default: null,
    },
  },
  data() {
    return {
      rtc: {
        localAudioTrack: null,
        localVideoTrack: null,
        client: null,
        microphoneId: null,
        cameraId: null,
      },
      audioDevices: null,
      videoDevices: null,
      isPublished: false,
      videoContainerId: "video",
      networkStatus: "-",
    };
  },
  computed: {},
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
    this.rtc.client.on("network-quality", (status) =>
      this.getNetworkStatus(status)
    );
    await this.rtc.localVideoTrack.play(this.videoContainerId);
  },
  methods: {
    handleFail(err) {
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
        await this.rtc.client.join(
          this.appid,
          this.channel,
          this.token,
          this.uid
        );
        console.log("join success");

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

        await this.rtc.client.leave();
        console.log("leave success");

        this.isPublished = false;
        this.networkStatus = AgoraHelper.networkStatues.OFFLINE;
      } catch (error) {
        this.handleFail(error);
        return;
      }
    },
    /**
     * 配信のネットワーク状態を取得
     * @param status {object}
     */
    getNetworkStatus(status) {
      this.networkStatus = AgoraHelper.convertNetworkStatus(
        status.uplinkNetworkQuality
      );
    },
  },
};
</script>
