<template>
    <div>
        <div
        :id="videoContainerId"
        style="width: 640px; height:480px; background-color: black;"
        ></div>
        <div class="button-group">
        <button
            v-if="isSubscribed"
            @click="play()"
            type="button"
            class="btn btn-primary btn-sm"
        >
            Play
        </button>
        </div>
    </div>
</template>

<script>
import AgoraRTC from "agora-rtc-sdk-ng";
import AgoraHelper from "../agora/agora.js";
import { AgoraError } from '../agora/error.js';
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
      },
      isSubscribed: false,
      videoContainerId: "video",
    };
  },
  async mounted() {
    AgoraHelper.setupAgoraRTC();
    this.rtc.client = AgoraHelper.createClient();
    this.rtc.client.setClientRole("audience");
    this.rtc.client.on('user-published', (user, mediaType) => this.subscribe(user, mediaType));
    this.rtc.client.on('user-unpublished', (user) => this.unSubscribe());
    await this.rtc.client.join(this.appid, this.channel, this.token, this.uid);
  },
  methods: {
    handleFail(err) {
      if (err instanceof AgoraError) {
        alert(err.message);
        return;
      }
    },
    async subscribe(user, mediaType) {
      try {
        await this.rtc.client.subscribe(user, mediaType);

        if (mediaType === "video") {
            this.rtc.localVideoTrack = user.videoTrack;
            console.log("video subscribe success");
        } else {
            this.rtc.localAudioTrack = user.audioTrack;
            console.log("audio subscribe success");
        }

        this.isSubscribed = true;
      } catch (error) {
        this.handleFail(error);
        return;
      }
    },
    async unSubscribe() {
        this.isSubscribed = false;
        console.log("unSubscribe success");
    },
    async play() {
        try {
            await this.rtc.localVideoTrack.play(this.videoContainerId);
            await this.rtc.localAudioTrack.play();
        } catch (error) {
            this.handleFail(error);
            return;
        }
    },
  },
};
</script>