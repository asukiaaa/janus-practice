import Janus from 'janus-gateway'

class JanusManager {
  janus = null
  idToWatch = 1
  // https://github.com/meetecho/janus-gateway/blob/495c038fc99953d840cc4dc5c4ef3057201a7584/html/demos/janus.js#L610
  iceServers = [{ urls: "stun:stun.l.google.com:19302" }] // 要らんかもしれん
  paqueId = null

  constructor(inittialize = true) {
    this.paqueId = "streamingtest-"+Janus.randomString(12);
    if (inittialize) {
      this.#init()
    }
    this.#createJanusInstance()
  }

  #init() {
    Janus.init({
      debug: true,
      dependencies: Janus.useDefaultDependencies(),
      callback: () => { console.log('callback of init') },
    })
  }

  #createJanusInstance() {
    this.janus = new Janus({
      server: "http://localhost:8088/janus",
      iccServers: this.iceServers,
      success: () => {
        console.log('suceeded')
        this.#attachPuligin()
      },
      error: (cause) => { console.log('error', cause) },
      destroyed: () => { console.log('destroyed') },
    })
  }

  #attachPuligin() {
    var pluginStreaming = null;
    this.janus.attach({
      plugin: "janus.plugin.streaming",
      paqueId: this.paqueId,
      success: (plugin) => {
        pluginStreaming = plugin
        console.log('attachecd to streaming', plugin)
        this.#showStreaming(plugin)
      },
      onmessage: (message, jsep) => {
        console.log('onmessage', message, jsep)
        var result = message["result"];
        if (result) {
          let status = result['status']
          console.log('status', status)
        }
        // let stereo = (jsep.sdp.indexOf("stereo=1") !== -1);
        if (jsep) {
          console.log("handle jsep")
          pluginStreaming.createAnswer({
            jsep,
            tracks: [{ type: "data" }],
            customizeSdp: (jsep) => {
              console.log('customizeSdp')
            },
            success: (jsep) => {
              console.log('success createAnswer')
              pluginStreaming.send({
                message: { request: "start", jsep },
                success: (data) => {
                  console.log('request to start', data)
                }
              })
            },
            error: (error) => {
              console.log('error at createAnswer', error)
            }
          })
        }
      },
      onremotetrack: (track, mid, on, metadata) => {
        console.log('on remotetrack', track, mid, on, metadata)
        if (track.kind == "video") {
          console.log('handle video')
          let stream = new MediaStream([track]);
          console.log('stream', stream)
          var video = document.getElementById("videoStream")
          video.srcObject = stream
          // remoteTracks[mid] = stream;
          Janus.log("Created remote video stream:", stream);
        }
      },
      oncleanup: () => Janus.log(" ::: Got a cleanup notification :::"),
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
      destroyed: () => {
        console.log('destroyed')
      }
    })
  }

  #showStreaming(plugin) {
    // https://github.com/meetecho/janus-gateway/blob/master/html/demos/streaming.js
    console.log('todo')
    plugin.send({
      message: { request: "list" },
      success: (result) => {
        console.log('got list', result.list)
        console.log(result.list[0])
        plugin.send({
          message: { request: "watch", id: this.idToWatch },
          success: (result) => { console.log("watch request", result) }
        })
        this.#getStreamingInfo(plugin, this.idToWatch)
      },
    })
  }

  #getStreamingInfo(plugin, id) {
    plugin.send({
      message: { request: "info", id },
      success: (info) => {
        console.log(info.info)
      }
    })
  }
}

const janusManater = new JanusManager()
console.log({ janusManater })
