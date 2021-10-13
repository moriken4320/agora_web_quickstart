<template>
  <div>
    <div :id="video.videoContainerId" class="video">
      <video :id="video.temElementId" :poster="startPoster"></video>
    </div>
    <div class="button-group">
      <button
        v-if="isPlayable"
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
  },
  data() {
    return {
      rtc: {
        remoteAudioTrack: null,
        remoteVideoTrack: null,
        client: null,
      },
      isPlayable: false,
      isPlaying: false,
      player: null,
      video: {
        videoContainerId: "video",
        temElementId: "tem-video",
      },
    };
  },
  async mounted() {
    AgoraHelper.setupAgoraRTC();
    this.rtc.client = await AgoraHelper.createClient();
    await this.rtc.client.setClientRole("audience");
    this.rtc.client.on("user-joined", (user) => this.liveStart(user));
    this.rtc.client.on("user-left", (user, reason) =>
      this.liveEnd(user, reason)
    );
    this.rtc.client.on("user-published", (user, mediaType) =>
      this.subscribe(user, mediaType)
    );
    this.rtc.client.on("user-unpublished", (user, mediaType) =>
      this.unSubscribe(user, mediaType)
    );
    await this.rtc.client.join(this.appid, this.channel, this.token, this.uid);
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

        this.isPlaying ? this.play() : this.stop();

        // this.player = videojs(this.video.temElementId, {
        //     children: [
        //         "bigPlayButton",
        //     ],
        // });
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
        if (mediaType === "audio") {
          this.rtc.remoteAudioTrack = null;
          console.log("audio unSubscribe success");
        } else {
          this.rtc.remoteVideoTrack = null;
          console.log("video unSubscribe success");
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
      this.rtc.remoteVideoTrack?.play(this.video.videoContainerId);
      this.rtc.remoteAudioTrack?.play();
      this.isPlaying = true;

      $("#" + this.video.temElementId).hide();
    },
    /**
     * 停止
     * @returns {void}
     */
    stop() {
      this.rtc.remoteVideoTrack?.stop();
      this.rtc.remoteAudioTrack?.stop();
      this.isPlaying = false;
    },
    /**
     * ライブ配信開始時
     */
    liveStart(user) {
      this.isPlayable = true;
      console.log("live started");
    },
    /**
     * ライブ配信切断時
     */
    liveEnd(user, reason) {
      this.stop();
      this.isPlayable = false;

      switch (reason) {
        case "Quit":
          $("#" + this.video.temElementId)
            .attr("poster", this.endPoster)
            .show();
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
