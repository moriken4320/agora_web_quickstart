<template>
  <div>
    <div
      :id="videoContainerId"
      style="width: 640px; height:480px; background-color: black;"
    ></div>
    <div class="button-group">
      <button
        v-if="isSubscribed"
        @click="isPlaying ? stop() : play()"
        type="button"
        class="btn btn-sm"
        :class="isPlaying ? 'btn-danger' : 'btn-primary'"
      >
        {{ isPlaying ? "stop" : "play" }}
      </button>
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
        remoteAudioTrack: null,
        remoteVideoTrack: null,
        client: null,
      },
      isSubscribed: false,
      isPlaying: false,
      videoContainerId: "video",
    };
  },
  computed: {},
  async mounted() {
    AgoraHelper.setupAgoraRTC();
    this.rtc.client = AgoraHelper.createClient();
    this.rtc.client.setClientRole("audience");
    this.rtc.client.on("user-published", (user, mediaType) =>
      this.subscribe(user, mediaType)
    );
    this.rtc.client.on("user-unpublished", (user) => this.unSubscribe());
    await this.rtc.client.join(this.appid, this.channel, this.token, this.uid);
  },
  methods: {
    handleFail(err) {
      if (err instanceof AgoraError) {
        alert(err.message);
        return;
      }
    },
    /**
     * サブスクライブする
     * @param user {object}
     * @param mediaType {string}
     * @returns {void}
     */
    async subscribe(user, mediaType) {
      try {
        await this.rtc.client.subscribe(user, mediaType);

        if (mediaType === "audio") {
          this.rtc.remoteAudioTrack = user.audioTrack;
          console.log("audio subscribe success");
        } else {
          this.rtc.remoteVideoTrack = user.videoTrack;
          console.log("video subscribe success");
        }

        this.isSubscribed = true;
      } catch (error) {
        this.handleFail(error);
        return;
      }
    },
    /**
     * サブスクライブをやめる
     * @returns {void}
     */
    async unSubscribe() {
      this.isSubscribed = false;
      console.log("unSubscribe success");
    },
    /**
     * 再生
     * @returns {void}
     */
    play() {
      this.rtc.remoteVideoTrack.play(this.videoContainerId);
      this.rtc.remoteAudioTrack.play();
      this.isPlaying = true;
    },
    /**
     * 停止
     * @returns {void}
     */
    stop() {
      this.rtc.remoteVideoTrack.stop();
      this.rtc.remoteAudioTrack.stop();
      this.isPlaying = false;
    },
  },
};
</script>
