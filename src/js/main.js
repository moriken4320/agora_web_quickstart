import AgoraRTC from "agora-rtc-sdk-ng";
import AgoraHelper from "./agora/agora";
import { AgoraError } from './agora/error';

import $ from "jquery";
import Vue from "vue";
import Sample from "./components/Sample.vue";

let rtc = {
    localAudioTrack: null,
    localVideoTrack: null,
    client: null,
    microphoneId: null,
    cameraId: null,
    videoContainerId: 'video',
};

async function startBasicLiveStreaming() {
    AgoraHelper.setupAgoraRTC();
    
    // -----------デバイス読み込み処理ここから-----------
    let audioDevices = null;
    let videoDevices = null;
    try {
        await AgoraHelper.checkDevicePermission();
        [audioDevices, videoDevices] = await AgoraHelper.getVideoAndMicDevicesAsync();
    } catch (error) {
        handleFail(error);
        return;
    }

    rtc.microphoneId = AgoraHelper.getConfiguredAudioDeviceId(audioDevices, '');
    rtc.cameraId = AgoraHelper.getConfiguredVideoDeviceId(videoDevices, '');
    [rtc.localAudioTrack, rtc.localVideoTrack] = await AgoraHelper.createMicrophoneAndCameraTracks(rtc.microphoneId, rtc.cameraId);
    // -----------デバイス読み込み処理ここまで-----------

    rtc.client = AgoraHelper.createClient();

    $(function() {
        $('button').on('click', async (event) => {
            const click_button = $(event.target);
            const select_role = click_button.data('role');

            if (select_role !== 'leave') {
                const app_id = process.env.AGORA_APP_ID;
                const token = process.env.TEM_TOKEN;
                const channel = "test";
                const uid = parseInt($('#uid').val(), 10);
                rtc.role = select_role;

                rtc.client.setClientRole(rtc.role);
                await rtc.client.join(app_id, channel, token, uid);
                $('button').attr('disabled', true);
                $('#leave').attr('disabled', false);

                if (rtc.role === 'host') {
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
                }
            } else {
                // Destroy the video containers.
                $(`#${rtc.videoContainerId}`).remove();

                if (rtc.role === 'host') {
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

const handleFail = (err) => {
    if (err instanceof AgoraError) {
        alert(err.message);
        return;
    }
};

startBasicLiveStreaming();

const app = new Vue({
    el: "#container",
    components: {
        Sample,
    },
});