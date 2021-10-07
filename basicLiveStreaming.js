import AgoraRTC from "agora-rtc-sdk-ng";

let rtc = {
    // For the local audio and video tracks.
    localAudioTrack: null,
    localVideoTrack: null,
    client: null
};

let options = {
    // Pass your app ID here.
    appId: process.env.AGORA_APP_ID,
    // Set the channel name.
    channel: "test",
    // Set the user role in the channel.
    role: "audience",
    // Use a temp token
    token: "your_temp_token",
    // Uid
    uid: 123456
};

let clientRoleOptions = {
    // Set latency level to low latency
    level: 1
}

async function startBasicLiveStreaming() {

    rtc.client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });

    window.onload = function () {

        document.getElementById("join").onclick = async function () {
            rtc.client.setClientRole(options.role, clientRoleOptions);
            await rtc.client.join(options.appId, options.channel, options.token, options.uid);
        }

        document.getElementById("leave").onclick = async function () {
            // Traverse all remote users.
            rtc.client.remoteUsers.forEach(user => {
                // Destroy the dynamically created DIV containers.
                const playerContainer = document.getElementById(user.uid);
                playerContainer && playerContainer.remove();
            });

            // Leave the channel.
            await rtc.client.leave();
        }
    }

    rtc.client.on("user-published", async (user, mediaType) => {
        // Subscribe to a remote user.
        await rtc.client.subscribe(user, mediaType);
        console.log("subscribe success");

        // If the subscribed track is video.
        if (mediaType === "video") {
            // Get `RemoteVideoTrack` in the `user` object.
            const remoteVideoTrack = user.videoTrack;
            // Dynamically create a container in the form of a DIV element for playing the remote video track.
            const remotePlayerContainer = document.createElement("div");
            // Specify the ID of the DIV container. You can use the `uid` of the remote user.
            remotePlayerContainer.id = user.uid.toString();
            remotePlayerContainer.textContent = "Remote user " + user.uid.toString();
            remotePlayerContainer.style.width = "640px";
            remotePlayerContainer.style.height = "480px";
            document.body.append(remotePlayerContainer);

            // Play the remote video track.
            // Pass the DIV container and the SDK dynamically creates a player in the container for playing the remote video track.
            remoteVideoTrack.play(remotePlayerContainer);

            // Or just pass the ID of the DIV container.
            // remoteVideoTrack.play(playerContainer.id);
        }

        // If the subscribed track is audio.
        if (mediaType === "audio") {
            // Get `RemoteAudioTrack` in the `user` object.
            const remoteAudioTrack = user.audioTrack;
            // Play the audio track. No need to pass any DOM element.
            remoteAudioTrack.play();
        }
    });

    rtc.client.on("user-unpublished", user => {
        // Get the dynamically created DIV container.
        const remotePlayerContainer = document.getElementById(user.uid);
        // Destroy the container.
        remotePlayerContainer.remove();
    });
}

startBasicLiveStreaming()