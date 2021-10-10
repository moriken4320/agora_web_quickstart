<template>
  <div>
    <div
      :id="videoContainerId"
      width="640"
      height="480"
      class="video"
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
  </div>
</template>

<script>
import AgoraRTC from "agora-rtc-sdk-ng";
import AgoraHelper from "../agora/agora.js";
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
    await this.rtc.client.join(this.appid, this.channel, this.token, this.uid);
    await this.rtc.localVideoTrack.play(this.videoContainerId);
  },
  methods: {
    handleFail(err) {
      if (err instanceof AgoraError) {
        alert(err.message);
        return;
      }
    },
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
    async unPublish() {
      try {
        await this.rtc.client.unpublish([
          this.rtc.localAudioTrack,
          this.rtc.localVideoTrack,
        ]);
        console.log("unPublish success");

        this.isPublished = false;
      } catch (error) {
        this.handleFail(error);
        return;
      }
    },
  },
};
</script>
