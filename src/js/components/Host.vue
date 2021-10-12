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
        <li>接続状態：{{ statuses.network }}</li>
        <li>ビデオビットレート：{{ statuses.videoBitrate }}</li>
        <li>オーディオビットレート：{{ statuses.audioBitrate }}</li>
        <li>フレームレート：{{ statuses.framerate }}</li>
        <li>送信データ総量：{{ statuses.sendTotalData }} bytes</li>
        <li>経過時間：{{ statuses.liveTime }}</li>
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
import { Timer } from "easytimer.js";

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
      storage: sessionStorage,
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
        network: "-",
        videoBitrate: 0,
        audioBitrate: 0,
        framerate: 0,
        sendTotalData: 0,
        liveTime: "00:00:00",
        packetLossRate: 0,
      },
    };
  },
  computed: {
    timer() {
      return new Timer({
        startValues: this.storage.getItem(this.token + "live-time")?.split(","),
      });
    },
  },
  created() {
    this.statuses.liveTime = this.timer.getTimeValues().toString();

    this.timer.addEventListener("secondsUpdated", (e) =>
      this.countUpAtLiveTime(e)
    );
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

        this.rtc.client.on("network-quality", (status) => {
          this.getStatus(status);
        });

        this.timer.start();
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
        this.rtc.client.getListeners("network-quality").forEach((listener) => {
          this.rtc.client.off("network-quality", listener);
        });

        await this.rtc.client.unpublish([
          this.rtc.localAudioTrack,
          this.rtc.localVideoTrack,
        ]);
        console.log("unPublish success");

        this.timer.pause();
        this.isPublished = false;
        this.statuses.network = AgoraHelper.networkStatues.OFFLINE;
      } catch (error) {
        this.handleFail(error);
        return;
      }
    },
    /**
     * 各ステータスを取得
     * @param status {object}
     */
    getStatus(status) {
      if (!this.isPublished) {
        return false;
      }

      this.statuses.network = AgoraHelper.convertNetworkStatus(
        status.uplinkNetworkQuality
      );
      this.statuses.videoBitrate = this.rtc.client.getLocalVideoStats().sendBitrate;
      this.statuses.audioBitrate = this.rtc.client.getLocalAudioStats().sendBitrate;
      this.statuses.framerate = this.rtc.client.getLocalVideoStats().sendFrameRate;
      this.statuses.sendTotalData = this.rtc.client.getRTCStats().SendBytes;
      this.statuses.packetLossRate = this.rtc.client.getLocalVideoStats().currentPacketLossRate;
    },
    /**
     * ライブ配信時間のカウントアップ処理
     * @param event
     * @returns {void}
     */
    countUpAtLiveTime(event) {
      const time = event.detail.timer.getTimeValues();
      this.statuses.liveTime = time.toString();
      this.storage.setItem(this.token + "live-time", [
        time.secondTenths,
        time.seconds,
        time.minutes,
        time.hours,
        time.days,
      ]);
    },
  },
};
</script>
