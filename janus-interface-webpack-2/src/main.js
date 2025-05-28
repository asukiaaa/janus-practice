import Janus from 'janus-gateway'

var server = null;
const host = process.env.JANUS_HOST || window.location.hostname;
if (window.location.protocol === 'http:')
  server = "http://" + host + ":8088/janus";
else
  server = "https://" + host + ":8089/janus";

server = "ws://" + host + ":8188";

// https://github.com/meetecho/janus-gateway/blob/495c038fc99953d840cc4dc5c4ef3057201a7584/html/demos/janus.js#L610
// const iceServers = [{ urls: "stun:stun.l.google.com:19302" }] // 要らんかもしれん
// const iceServers = null;
// https://groups.google.com/g/meetecho-janus/c/J6uhVk9jBfE
// const iceServers = [{ urls: "trun:" + host + ":3478?transport=udp" }]
const iceServers = process.env.ICE_URL ? [{
  urls: process.env.ICE_URL,
  username: process.env.ICE_USERNAME,
  credential: process.env.ICE_PASSWORD,
}] : null

var remoteTracks = {}, remoteVideos = 0;

// var simulcastStarted = {}, svcStarted = {};

// var streamsList = {};

class JanusManager {
  janus = null
  streaming = null
  selectedStream = null;
  opaqueId = null;

  constructor() {
    this.opaqueId = "streamingtest-" + Janus.randomString(12);
    this.#init()
  }

  #init() {
    Janus.init({
      debug: "all", callback: () => {
        this.#createJanusInstance()
      }
    });
    const btnAction = document.getElementById("btn-play")
    btnAction.addEventListener("click", (event) => {
      event.preventDefault()
      console.log('clicked')
      this.selectedStream = 1
      this.startStream(this.streaming, this.selectedStream)
      this.getStreamInfo(this.streaming);
    })
  }

  #createJanusInstance() {
    // Create session
    this.janus = new Janus({
      server: server,
      iceServers: iceServers,
      success: () => {
        // Attach to Streaming plugin
        this.#attachPlugin()
      },
      error: function (error) {
        Janus.error(error);
      },
      destroyed: function () {
        window.location.reload();
      }
    });
  }

  #attachPlugin() {
    this.janus.attach({
      plugin: "janus.plugin.streaming",
      opaqueId: this.opaqueId,
      success: (pluginHandle) => {
        this.streaming = pluginHandle;
        Janus.log("Plugin attached! (" + this.streaming.getPlugin() + ", id=" + this.streaming.getId() + ")");
        // Setup streaming session
        this.updateStreamsList(this.streaming);
      },
      error: function (error) {
        Janus.error("  -- Error attaching plugin... ", error);
        bootbox.alert("Error attaching plugin... " + error);
      },
      iceState: function (state) {
        Janus.log("ICE state changed to " + state);
      },
      webrtcState: function (on) {
        Janus.log("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
      },
      slowLink: function (uplink, lost, mid) {
        Janus.warn("Janus reports problems " + (uplink ? "sending" : "receiving") +
          " packets on mid " + mid + " (" + lost + " lost packets)");
      },
      onmessage: (msg, jsep) => {
        Janus.debug(" ::: Got a message :::", msg);
        let result = msg["result"];
        if (result) {
          if (result["status"]) {
            let status = result["status"];
            if (status === 'stopped')
              this.stopStream(this.streaming);
          } else if (msg["streaming"] === "event") {
            // Does this event refer to a mid in particular?
            let mid = result["mid"] ? result["mid"] : "0";
            // Is simulcast in place?
            let substream = result["substream"];
            let temporal = result["temporal"];
            if ((substream !== null && substream !== undefined) || (temporal !== null && temporal !== undefined)) {
              // if (!simulcastStarted[mid]) {
              //   simulcastStarted[mid] = true;
              //   // addSimulcastButtons(mid, this.streaming);
              // }
              // We just received notice that there's been a switch, update the buttons
              // updateSimulcastButtons(mid, substream, temporal);
            }
            // Is VP9/SVC in place?
            let spatial = result["spatial_layer"];
            temporal = result["temporal_layer"];
            if ((spatial !== null && spatial !== undefined) || (temporal !== null && temporal !== undefined)) {
              // if (!svcStarted[mid]) {
              //   svcStarted[mid] = true;
              //   // addSvcButtons(mid, this.streaming);
              // }
              // We just received notice that there's been a switch, update the buttons
              // updateSvcButtons(mid, spatial, temporal);
            }
          }
        } else if (msg["error"]) {
          bootbox.alert(msg["error"]);
          stopStream(this.streaming);
          return;
        }
        if (jsep) {
          Janus.debug("Handling SDP as well...", jsep);
          let stereo = (jsep.sdp.indexOf("stereo=1") !== -1);
          // Offer from the plugin, let's answer
          this.streaming.createAnswer(
            {
              jsep: jsep,
              // We only specify data channels here, as this way in
              // case they were offered we'll enable them. Since we
              // don't mention audio or video tracks, we autoaccept them
              // as recvonly (since we won't capture anything ourselves)
              tracks: [
                { type: 'data' }
              ],
              customizeSdp: function (jsep) {
                if (stereo && jsep.sdp.indexOf("stereo=1") == -1) {
                  // Make sure that our offer contains stereo too
                  jsep.sdp = jsep.sdp.replace("useinbandfec=1", "useinbandfec=1;stereo=1");
                }
              },
              success: (jsep) => {
                Janus.debug("Got SDP!", jsep);
                let body = { request: "start" };
                this.streaming.send({ message: body, jsep: jsep });
              },
              error: function (error) {
                Janus.error("WebRTC error:", error);
                bootbox.alert("WebRTC error... " + error.message);
              }
            });
        }
      },
      onremotetrack: (...args) => this.#onremotetrack(...args),
      // eslint-disable-next-line no-unused-vars
      ondataopen: function (label, protocol) {
        Janus.log("The DataChannel is available!");
      },
      ondata: function (data) {
        Janus.debug("We got data from the DataChannel!", data);
      },
      oncleanup: function () {
        Janus.log(" ::: Got a cleanup notification :::");
        // simulcastStarted = false;
        remoteTracks = {};
        remoteVideos = 0;
        dataMid = null;
      }
    });
  }

  #onremotetrack(track, mid, on, metadata) {
    Janus.debug(
      "Remote track (mid=" + mid + ") " +
      (on ? "added" : "removed") +
      (metadata ? " (" + metadata.reason + ") " : "") + ":", track
    );
    let mstreamId = "mstream" + mid;
    // if (streamsList[this.selectedStream] && streamsList[this.selectedStream].legacy)
    //   mstreamId = "mstream0";
    if (!on) {
      // Track removed, get rid of the stream and the rendering
      if (track.kind === "video") {
        remoteVideos--;
        if (remoteVideos === 0) {
          // No video, at least for now: show a placeholder
        }
      }
      delete remoteTracks[mid];
      return;
    }
    let stream = null;
    if (track.kind === "audio") {
      // New audio track: create a stream out of it, and use a hidden <audio> element
      stream = new MediaStream([track]);
      remoteTracks[mid] = stream;
      Janus.log("Created remote audio stream:", stream);
      if (remoteVideos === 0) {
        // No video, at least for now: show a placeholder
      }
    } else {
      // New video track: create a stream out of it
      remoteVideos++;
      stream = new MediaStream([track]);
      remoteTracks[mid] = stream;
      Janus.log("Created remote video stream:", stream);
    }
    var element = document.getElementById("videoStream")
    // Janus.attachMediaStream(element, stream);
    element.srcObject = stream;
    // element.strObject = stream;
    // element.src = URL.createObjectURL(stream);
    var playPromise = element.play();
    console.log('play video')
    if (playPromise !== undefined) {
      playPromise
        .then(_ => {
          console.log('started play')
        })
        .catch(error => {
          console.log('failed to play', error)
        });
    }
  }

  getStreamInfo(streaming) {
    let body = { request: "info", id: parseInt(this.selectedStream) || this.selectedStream };
    streaming.send({
      message: body, success: (result) => {
        if (result && result.info && result.info.metadata) {
        }
      }
    });
  }

  updateStreamsList(streaming) {
    let body = { request: "list" };
    Janus.debug("Sending message:", body);
    streaming.send({
      message: body, success: function (result) {
        if (!result) {
          bootbox.alert("Got no response to our query for available streams");
          return;
        }
        if (result["list"]) {
          let list = result["list"];
          if (list && Array.isArray(list)) {
            list.sort(function (a, b) {
              if (!a || a.id < (b ? b.id : 0))
                return -1;
              if (!b || b.id < (a ? a.id : 0))
                return 1;
              return 0;
            });
          }
          Janus.log("Got a list of available streams:", list);
          // streamsList = {};
          for (let mp in list) {
            Janus.debug("  >> [" + list[mp]["id"] + "] " + list[mp]["description"] + " (" + list[mp]["type"] + ")");
            // Check the nature of the available streams, and if there are some multistream ones
            list[mp].legacy = true;
            if (list[mp].media) {
              let audios = 0, videos = 0;
              for (let mi in list[mp].media) {
                if (!list[mp].media[mi])
                  continue;
                if (list[mp].media[mi].type === "audio")
                  audios++;
                else if (list[mp].media[mi].type === "video")
                  videos++;
                if (audios > 1 || videos > 1) {
                  list[mp].legacy = false;
                  break;
                }
              }
            }
            // Keep track of all the available streams
            // streamsList[list[mp]["id"]] = list[mp];
          }
        }
      }
    });
  }

  startStream(streaming, id) {
    let body = { request: "watch", id };
    streaming.send({ message: body });
  }

  stopStream(streaming) {
    let body = { request: "stop" };
    streaming.send({ message: body });
    streaming.hangup();
  }

}

var janusManager = null
document.addEventListener("DOMContentLoaded", () => {
  janusManager = new JanusManager()
})
