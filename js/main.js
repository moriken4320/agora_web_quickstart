import AgoraRTC from "agora-rtc-sdk-ng";
import AgoraHelper from "./agora";

import $ from "jquery";
import Vue from "vue";
import Sample from "./components/Sample.vue";

let rtc = {
    // For the local audio and video tracks.
    localAudioTrack: null,
    localVideoTrack: null,
    client: null,
    role: null,
    videoContainerId: 'video',
};

async function startBasicLiveStreaming() {

    AgoraHelper.setupAgoraRTC();

    rtc.client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });

    $(function() {
        $('button').on('click', async (event) => {
            const click_button = $(event.target);
            const select_role = click_button.data('role');

            if (select_role !== 'leave') {
                const app_id = process.env.AGORA_APP_ID;
                const token = $('#token').val();
                const channel = $('#channel').val();
                const uid = parseInt($('#uid').val(), 10);
                rtc.role = select_role;

                rtc.client.setClientRole(rtc.role);
                await rtc.client.join(app_id, channel, token, uid);
                $('button').attr('disabled', true);
                $('#leave').attr('disabled', false);

                if (rtc.role === 'host') {
                    // Capture and audio and video at one time
                    rtc.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                    rtc.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
                    // You can also publish multiple tracks at once
                    await rtc.client.publish([rtc.localAudioTrack, rtc.localVideoTrack]);
                    console.log("publish success");
                    // Dynamically create a container in the form of a DIV element for playing the remote video track.
                    const localPlayerContainer = $("<div />", {
                        attr: {"id": rtc.videoContainerId},
                        width: 640,
                        height: 480,
                        text: "Local user " + rtc.client.uid.toString(),
                    });
                    $('#container').append(localPlayerContainer);

                    rtc.localVideoTrack.play(rtc.videoContainerId);
                    rtc.localAudioTrack.play();
                }
            } else {
                // Destroy the video containers.
                $(`#${rtc.videoContainerId}`).remove();

                if (rtc.role === 'host') {
                    await rtc.localAudioTrack.close();
                    await rtc.localVideoTrack.close();
                    await rtc.client.unpublish([rtc.localAudioTrack, rtc.localVideoTrack]);
                    console.log('unpublish success');
                }
                
                rtc.role = select_role;
                
                await rtc.client.leave();
                $('button').attr('disabled', false);
                $('#leave').attr('disabled', true);
            }
        });
    });


    rtc.client.on("user-published", async (user, mediaType) => {
        // Subscribe to a remote user.
        await rtc.client.subscribe(user, mediaType);
        console.log("subscribe success");

        // If the subscribed track is video.
        if (mediaType === "video") {
            // Get `RemoteVideoTrack` in the `user` object.
            rtc.localVideoTrack = user.videoTrack;
            // Dynamically create a container in the form of a DIV element for playing the remote video track.
            const remotePlayerContainer = $("<div />", {
                attr: {"id": rtc.videoContainerId},
                width: 640,
                height: 480,
                text: "Remote user " + user.uid.toString(),
            });
            $('#container').append(remotePlayerContainer);

            // Play the remote video track.
            rtc.localVideoTrack.play(rtc.videoContainerId);
        }

        // If the subscribed track is audio.
        if (mediaType === "audio") {
            // Get `RemoteAudioTrack` in the `user` object.
            rtc.localAudioTrack = user.audioTrack;
            // Play the audio track. No need to pass any DOM element.
            rtc.localAudioTrack.play();
        }
    });

    rtc.client.on("user-unpublished", async (user) => {
        // Destroy the container.
        $(`#${rtc.videoContainerId}`).remove();

        // 自動でRemoteTrackを解放するため、unsubscribeを呼ぶ必要なし。

        // Leave the channel.
        await rtc.client.leave();
        $('button').attr('disabled', false);
        $('#leave').attr('disabled', true);
    });
}

startBasicLiveStreaming()

const app = new Vue({
    el: "#container",
    components: {
        Sample,
    },
});