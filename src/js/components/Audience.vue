<template>
  <div>
    <div class="d-flex">
      <div :id="videoElementId" class="video">
        <video v-show="!isPlaying" :poster="poster"></video>
      </div>
      <div :id="shareScreenElementId" class="video"></div>
    </div>

    <div class="button-group">
      <button
        v-if="isLiveState.start && !isLiveState.finish"
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
import "video.js/dist/video-js.css";
import videojs from "video.js";
import temStartPoster from "../../images/start.png";
import temEndPoster from "../../images/end.png";

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
    startPoster: {
      type: String,
      default: temStartPoster,
    },
    endPoster: {
      type: String,
      default: temEndPoster,
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
      videoElementId: "video",
      shareScreenElementId: "share-screen",
      //   player: null,
      isPlaying: false,
      isLiveState: {
        start: false,
        finish: false,
      },
      rtc: {
        remoteAudioTrack: null,
        remoteVideoTrack: null,
        remoteScreenTrack: null,
        remoteUserId: null,
        client: null,
      },
    };
  },
  computed: {
    poster() {
      return this.isLiveState.finish ? this.endPoster : this.startPoster;
    },
  },
  created() {
    this.isLiveState.start = this.liveStartFlagFromServer;
    this.isLiveState.finish = this.liveFinishFlagFromServer;
  },
  async mounted() {
    try {
      AgoraHelper.setupAgoraRTC();

      this.rtc.client = await AgoraHelper.createClient();
      await this.rtc.client.setClientRole("audience");
      //   this.rtc.client.on("user-joined", (user) => this.liveStart(user));
      //   this.rtc.client.on("user-left", (user, reason) =>
      //     this.liveEnd(user, reason)
      //   );
      this.rtc.client.on("user-published", (user, mediaType) =>
        this.subscribe(user, mediaType)
      );
      //   this.rtc.client.on("user-unpublished", (user, mediaType) =>
      //     this.unSubscribe(user, mediaType)
      //   );
      await AgoraHelper.setupClientAsync(
        this.rtc.client,
        this.appid,
        this.channel,
        this.token,
        this.uid,
        true
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
     * サブスクライブする
     * @param user {object}
     * @param mediaType {string}
     * @returns {void}
     */
    async subscribe(user, mediaType) {
      try {
        await this.rtc.client.subscribe(user, mediaType);

        if (user.audioTrack === undefined) {
          this.rtc.remoteScreenTrack = user.videoTrack;
          console.log("share screen subscribe success: " + user.uid);
        } else {
          this.rtc.remoteUserId = user.uid;
          if (mediaType === "audio") {
            this.rtc.remoteAudioTrack = user.audioTrack;
            console.log("audio subscribe success: " + user.uid);
          } else {
            this.rtc.remoteVideoTrack = user.videoTrack;
            console.log("video subscribe success: " + user.uid);
          }
        }

        this.isPlaying ? this.play() : this.stop();
      } catch (error) {
        this.handleFail(error);
        return;
      }
    },
    /**
     * サブスクライブを解除
     * @returns {void}
     */
    async unSubscribe(user, mediaType) {
      try {
        if (user.audioTrack === undefined) {
          this.rtc.remoteScreenTrack = null;
          console.log("share screen unSubscribe success: " + user.uid);
          return;
        }

        if (mediaType === "audio") {
          this.rtc.remoteAudioTrack = null;
          console.log("audio unSubscribe success: " + user.uid);
        } else {
          this.rtc.remoteVideoTrack = null;
          console.log("video unSubscribe success: " + user.uid);
        }
      } catch (error) {
        this.handleFail(error);
        return;
      }
    },
    /**
     * 再生
     * @returns {void}
     */
    play() {
      this.rtc.remoteVideoTrack?.play(this.videoElementId);
      this.rtc.remoteAudioTrack?.play();
      this.rtc.remoteScreenTrack?.play(this.shareScreenElementId);
      this.isPlaying = true;
    },
    /**
     * 停止
     * @returns {void}
     */
    stop() {
      this.rtc.remoteVideoTrack?.stop();
      this.rtc.remoteAudioTrack?.stop();
      this.rtc.remoteScreenTrack?.stop();
      this.isPlaying = false;
    },
    /**
     * ライブ配信切断時
     */
    liveEnd(user, reason) {
      switch (reason) {
        case "Quit":
          this.rtc.client.leave();
          console.log("live finished");
          break;
        case "ServerTimeOut":
          const msg =
            "live disconnected!! \nplease wait.\nif display start-button, please push it.";
          this.handleFail(new AgoraError(msg));
          break;
      }
    },
  },
};
</script>

<style scope>
.video {
  width: 640px;
  height: 480px;
  background-color: black;
}
video {
  width: 100%;
  height: 100%;
}
</style>
