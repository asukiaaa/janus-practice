import Janus from 'janus-gateway'

var server = null;
const host = process.env.JANUS_HOST || window.location.hostname;
if (window.location.protocol === 'http:')
  server = "http://" + host + ":8088/janus";
else
  server = "https://" + host + ":8089/janus";

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

// console.log('iceServers', iceServers[0])

// class JanusManager0 {
//   janus = null
//   idToWatch = 1
//   paqueId = null

//   constructor(inittialize = true) {
//     this.paqueId = "streamingtest-" + Janus.randomString(12);
//     if (inittialize) {
//       this.#init()
//     }
//     this.#createJanusInstance()
//   }

//   #init() {
//     Janus.init({
//       debug: true,
//       dependencies: Janus.useDefaultDependencies(),
//       callback: () => { console.log('callback of init') },
//     })
//   }

//   #createJanusInstance() {
//     this.janus = new Janus({
//       server,
//       iceServers,
//       success: () => {
//         console.log('suceeded')
//         this.#attachPuliginStream()
//       },
//       error: (cause) => { console.log('error', cause) },
//       destroyed: () => { console.log('destroyed') },
//     })
//   }

//   #attachPuliginStream() {
//     var pluginStreaming = null;
//     this.janus.attach({
//       plugin: "janus.plugin.streaming",
//       paqueId: this.paqueId,
//       success: (plugin) => {
//         pluginStreaming = plugin
//         console.log('attachecd to streaming', plugin)
//         this.#showStreaming(plugin)
//       },
//       onmessage: (message, jsep) => {
//         console.log('onmessage', message, jsep)
//         var result = message["result"];
//         if (result) {
//           let status = result['status']
//           console.log('status', status)
//         }
//         // let stereo = (jsep.sdp.indexOf("stereo=1") !== -1);
//         if (jsep) {
//           console.log("handle jsep")
//           pluginStreaming.createAnswer({
//             jsep,
//             tracks: [{ type: "data" }],
//             customizeSdp: (jsep) => {
//               console.log('customizeSdp')
//             },
//             success: (jsep) => {
//               console.log('success createAnswer')
//               pluginStreaming.send({
//                 message: { request: "start", jsep },
//                 success: (data) => {
//                   console.log('request to start', data)
//                 }
//               })
//             },
//             error: (error) => {
//               console.log('error at createAnswer', error)
//             }
//           })
//         }
//       },
//       onremotetrack: (track, mid, on, metadata) => {
//         console.log('on remotetrack', track, mid, on, metadata)
//         if (track.kind == "video") {
//           console.log('handle video')
//           let stream = new MediaStream([track]);
//           console.log('stream', stream)
//           var video = document.getElementById("videoStream")
//           video.srcObject = stream
//           video.play().then(() => {
//             console.log('start playing')
//           }).catch(() => {
//             console.log('failed to play')
//           })
//           // remoteTracks[mid] = stream;
//           Janus.log("Created remote video stream:", stream);
//         }
//       },
//       oncleanup: () => Janus.log(" ::: Got a cleanup notification :::"),
//       iceState: function (state) {
//         Janus.log("ICE state changed to " + state);
//       },
//       webrtcState: function (on) {
//         Janus.log("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
//       },
//       slowLink: function (uplink, lost, mid) {
//         Janus.warn("Janus reports problems " + (uplink ? "sending" : "receiving") +
//           " packets on mid " + mid + " (" + lost + " lost packets)");
//       },
//       destroyed: () => {
//         console.log('destroyed')
//       }
//     })
//   }

//   #showStreaming(plugin) {
//     // https://github.com/meetecho/janus-gateway/blob/master/html/demos/streaming.js
//     console.log('todo')
//     plugin.send({
//       message: { request: "list" },
//       success: (result) => {
//         console.log('got list', result.list)
//         console.log(result.list[0])
//         plugin.send({
//           message: { request: "watch", id: this.idToWatch },
//           success: (result) => { console.log("watch request", result) }
//         })
//         this.#getStreamingInfo(plugin, this.idToWatch)
//       },
//     })
//   }

//   #getStreamingInfo(plugin, id) {
//     plugin.send({
//       message: { request: "info", id },
//       success: (info) => {
//         console.log(info.info)
//       }
//     })
//   }
// }

// const janusManager = new JanusManager()

import $ from 'jquery'
var opaqueId = "streamingtest-" + Janus.randomString(12);

var remoteTracks = {}, remoteVideos = 0, dataMid = null;
var bitrateTimer = {};

var simulcastStarted = {}, svcStarted = {};

var streamsList = {};
var selectedStream = null;

class JanusManager {
  janus = null
  streaming = null

  constructor() {
    this.#init()
  }

  #init() {
    Janus.init({
      debug: "all", callback: () => {
        // Use a button to start the demo
        $('#start').one('click', function () {
          $(this).attr('disabled', true).unbind('click');
          // Make sure the browser supports WebRTC
          if (!Janus.isWebrtcSupported()) {
            bootbox.alert("No WebRTC support... ");
            return;
          }
        });
        this.#createJanusInstance()
      }
    });
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
        bootbox.alert(error, function () {
          window.location.reload();
        });
      },
      destroyed: function () {
        window.location.reload();
      }
    });
  }

  #attachPlugin() {
    this.janus.attach({
      plugin: "janus.plugin.streaming",
      opaqueId: opaqueId,
      success: (pluginHandle) => {
        $('#details').remove();
        this.streaming = pluginHandle;
        Janus.log("Plugin attached! (" + this.streaming.getPlugin() + ", id=" + this.streaming.getId() + ")");
        // Setup streaming session
        $('#update-streams').click(() => updateStreamsList(this.streaming));
        updateStreamsList(this.streaming);
        $('#start').removeAttr('disabled').html("Stop")
          .on("click", () => {
            $(this).attr('disabled', true);
            for (let i in bitrateTimer)
              clearInterval(bitrateTimer[i]);
            bitrateTimer = {};
            this.janus.destroy();
            $('#streamslist').attr('disabled', true);
            $('#watch').attr('disabled', true).unbind('click');
            $('#start').attr('disabled', true).html("Bye").unbind('click');
          });
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
            if (status === 'starting')
              $('#status').removeClass('hide').text("Starting, please wait...").removeClass('hide');
            else if (status === 'started')
              $('#status').removeClass('hide').text("Started").removeClass('hide');
            else if (status === 'stopped')
              stopStream(this.streaming);
          } else if (msg["streaming"] === "event") {
            // Does this event refer to a mid in particular?
            let mid = result["mid"] ? result["mid"] : "0";
            // Is simulcast in place?
            let substream = result["substream"];
            let temporal = result["temporal"];
            if ((substream !== null && substream !== undefined) || (temporal !== null && temporal !== undefined)) {
              if (!simulcastStarted[mid]) {
                simulcastStarted[mid] = true;
                addSimulcastButtons(mid, this.streaming);
              }
              // We just received notice that there's been a switch, update the buttons
              updateSimulcastButtons(mid, substream, temporal);
            }
            // Is VP9/SVC in place?
            let spatial = result["spatial_layer"];
            temporal = result["temporal_layer"];
            if ((spatial !== null && spatial !== undefined) || (temporal !== null && temporal !== undefined)) {
              if (!svcStarted[mid]) {
                svcStarted[mid] = true;
                addSvcButtons(mid, this.streaming);
              }
              // We just received notice that there's been a switch, update the buttons
              updateSvcButtons(mid, spatial, temporal);
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
                $('#watch').html("Stop").removeAttr('disabled').on('click', () => stopStream(this.streaming));
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
        $('.waitingvideo').remove();
        $('#mstream' + dataMid).append(
          '<input class="form-control" type="text" id="datarecv" disabled></input>'
        );
      },
      ondata: function (data) {
        Janus.debug("We got data from the DataChannel!", data);
        $('#datarecv').val(data);
      },
      oncleanup: () => {
        Janus.log(" ::: Got a cleanup notification :::");
        $('#videos').empty();
        $('#info').addClass('hide');
        for (let i in bitrateTimer)
          clearInterval(bitrateTimer[i]);
        bitrateTimer = {};
        simulcastStarted = false;
        remoteTracks = {};
        remoteVideos = 0;
        dataMid = null;
        $('#streamset').removeAttr('disabled');
        $('#streamslist').removeAttr('disabled');
        $('#watch').html("Watch").removeAttr('disabled')
          .on('click', () => startStream(this.streaming));
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
    if (streamsList[selectedStream] && streamsList[selectedStream].legacy)
      mstreamId = "mstream0";
    if (!on) {
      // Track removed, get rid of the stream and the rendering
      $('#remotevideo' + mid).remove();
      if (track.kind === "video") {
        remoteVideos--;
        if (remoteVideos === 0) {
          // No video, at least for now: show a placeholder
          if ($('#' + mstreamId + ' .no-video-container').length === 0) {
            $('#' + mstreamId).append(
              '<div class="no-video-container">' +
              '<i class="fa-solid fa-video fa-xl no-video-icon"></i>' +
              '<span class="no-video-text">No remote video available</span>' +
              '</div>');
          }
        }
      }
      delete remoteTracks[mid];
      return;
    }
    if ($('#remotevideo' + mid).length > 0)
      return;
    // If we're here, a new track was added
    $('#spinner' + mid).remove();
    let stream = null;
    if (track.kind === "audio") {
      // New audio track: create a stream out of it, and use a hidden <audio> element
      stream = new MediaStream([track]);
      remoteTracks[mid] = stream;
      Janus.log("Created remote audio stream:", stream);
      $('#' + mstreamId).append('<audio class="hide" id="remotevideo' + mid + '" playsinline/>');
      $('#remotevideo' + mid).get(0).volume = 0;
      if (remoteVideos === 0) {
        // No video, at least for now: show a placeholder
        if ($('#' + mstreamId + ' .no-video-container').length === 0) {
          $('#' + mstreamId).append(
            '<div class="no-video-container audioonly">' +
            '<i class="fa-solid fa-video fa-xl no-video-icon"></i>' +
            '<span class="no-video-text">No video available</span>' +
            '</div>');
        }
      }
    } else {
      // New video track: create a stream out of it
      remoteVideos++;
      $('.no-video-container').remove();
      stream = new MediaStream([track]);
      remoteTracks[mid] = stream;
      Janus.log("Created remote video stream:", stream);
      $('#' + mstreamId).append('<video class="rounded centered hide" id="remotevideo' + mid + '" width="100%" height="100%" playsinline/>');
      $('#remotevideo' + mid).get(0).volume = 0;
      // Use a custom timer for this stream
      if (!bitrateTimer[mid]) {
        $('#curbitrate' + mid).removeClass('hide');
        bitrateTimer[mid] = setInterval(() => {
          if (!$("#remotevideo" + mid).get(0))
            return;
          // Display updated bitrate, if supported
          let bitrate = this.streaming.getBitrate(mid);
          $('#curbitrate' + mid).text(bitrate);
          // Check if the resolution changed too
          let width = $("#remotevideo" + mid).get(0).videoWidth;
          let height = $("#remotevideo" + mid).get(0).videoHeight;
          if (width > 0 && height > 0)
            $('#curres' + mid).removeClass('hide').text(width + 'x' + height).removeClass('hide');
        }, 1000);
      }
    }
    // Play the stream when we get a playing event
    $("#remotevideo" + mid).bind("playing", function (ev) {
      $('.waitingvideo').remove();
      if (!this.videoWidth)
        return;
      $('#' + ev.target.id).removeClass('hide');
      let width = this.videoWidth;
      let height = this.videoHeight;
      $('#curres' + mid).removeClass('hide').text(width + 'x' + height).removeClass('hide');
      if (Janus.webRTCAdapter.browserDetails.browser === "firefox") {
        // Firefox Stable has a bug: width and height are not immediately available after a playing
        setTimeout(function () {
          let width = $('#' + ev.target.id).get(0).videoWidth;
          let height = $('#' + ev.target.id).get(0).videoHeight;
          $('#curres' + mid).removeClass('hide').text(width + 'x' + height).removeClass('hide');
        }, 2000);
      }
    });
    Janus.attachMediaStream($('#remotevideo' + mid).get(0), stream);
    var playPromise = $('#remotevideo' + mid).get(0).play();
    if (playPromise !== undefined) {
      playPromise
        .then(_ => {
          console.log('started play')
        })
        .catch(error => {
          console.log('failed to play', error)
        });
    }
    $('#remotevideo' + mid).get(0).volume = 1;
  }

}

var janusManager = null
$(document).ready(() => {
  janusManager = new JanusManager()
});

function updateStreamsList(streaming) {
  $('#update-streams').unbind('click').addClass('fa-spin');
  let body = { request: "list" };
  Janus.debug("Sending message:", body);
  streaming.send({
    message: body, success: function (result) {
      setTimeout(function () {
        $('#update-streams').removeClass('fa-spin').unbind('click').click(() => updateStreamsList(streaming));
      }, 500);
      if (!result) {
        bootbox.alert("Got no response to our query for available streams");
        return;
      }
      if (result["list"]) {
        $('#streams').removeClass('hide');
        $('#streamslist').empty();
        $('#watch').attr('disabled', true).unbind('click');
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
        streamsList = {};
        for (let mp in list) {
          Janus.debug("  >> [" + list[mp]["id"] + "] " + list[mp]["description"] + " (" + list[mp]["type"] + ")");
          $('#streamslist').append("<a class='dropdown-item' href='#' id='" + list[mp]["id"] + "'>" + escapeXmlTags(list[mp]["description"]) + " (" + list[mp]["type"] + ")" + "</a>");
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
          streamsList[list[mp]["id"]] = list[mp];
        }
        $('#streamslist a').off('click').on('click', function () {
          selectedStream = $(this).attr("id");
          $('#streamset').html($(this).html());
        });
        $('#watch').removeAttr('disabled').on('click', () => startStream(streaming));
      }
    }
  });
}

function getStreamInfo(streaming) {
  $('#metadata').empty();
  $('#info').addClass('hide');
  if (!selectedStream || !streamsList[selectedStream])
    return;
  // Send a request for more info on the mountpoint we subscribed to
  let body = { request: "info", id: parseInt(selectedStream) || selectedStream };
  streaming.send({
    message: body, success: function (result) {
      if (result && result.info && result.info.metadata) {
        $('#metadata').html(escapeXmlTags(result.info.metadata));
        $('#info').removeClass('hide');
      }
    }
  });
}

function startStream(streaming) {
  Janus.log("Selected video id #" + selectedStream);
  if (!selectedStream || !streamsList[selectedStream]) {
    bootbox.alert("Select a stream from the list");
    return;
  }
  $('#streamset').attr('disabled', true);
  $('#streamslist').attr('disabled', true);
  $('#watch').attr('disabled', true).unbind('click');
  // Add some panels to host the remote streams
  if (streamsList[selectedStream].legacy) {
    // At max 1-audio/1-video, so use a single panel
    let mid = null;
    for (let mi in streamsList[selectedStream].media) {
      // Add a new panel
      let type = streamsList[selectedStream].media[mi].type;
      if (type === "video") {
        mid = streamsList[selectedStream].media[mi].mid;
        break;
      }
    }
    if ($('#mstream0').length === 0) {
      addPanel("0", (mid ? mid : "0"));
      // No remote video yet
      $('#mstream0').append('<video class="rounded centered waitingvideo" id="waitingvideo0" width="100%" height="100%" />');
    }
    dataMid = "0";
  } else {
    // Multistream mountpoint, create a panel for each stream
    for (let mi in streamsList[selectedStream].media) {
      // Add a new panel
      let type = streamsList[selectedStream].media[mi].type;
      let mid = streamsList[selectedStream].media[mi].mid;
      let label = streamsList[selectedStream].media[mi].label;
      if ($('#mstream' + mid).length === 0) {
        addPanel(mid, mid, label);
        // No remote media yet
        $('#mstream' + mid).append('<video class="rounded centered waitingvideo" id="waitingvideo' + mid + '" width="100%" height="100%" />');
      }
      if (type === 'data')
        dataMid = mid;
    }
  }
  // Prepare the request to start streaming and send it
  let body = { request: "watch", id: parseInt(selectedStream) || selectedStream };
  // Notice that, for RTP mountpoints, you can subscribe to a subset
  // of the mountpoint media, rather than them all, by adding a "stream"
  // array containing the list of stream mids you're interested in, e.g.:
  //
  //		body.streams = [ "0", "2" ];
  //
  // to only subscribe to the first and third stream, and skip the second
  // (assuming those are the mids you got from a "list" or "info" request).
  // By default, you always subscribe to all the streams in a mountpoint
  streaming.send({ message: body });
  // Get some more info for the mountpoint to display, if any
  getStreamInfo(streaming);
}

function stopStream(streaming) {
  $('#watch').attr('disabled', true).unbind('click');
  let body = { request: "stop" };
  streaming.send({ message: body });
  streaming.hangup();
}

// Helper to escape XML tags
function escapeXmlTags(value) {
  if (value) {
    let escapedValue = value.replace(new RegExp('<', 'g'), '&lt');
    escapedValue = escapedValue.replace(new RegExp('>', 'g'), '&gt');
    return escapedValue;
  }
}

// Helper to add a new panel to the 'videos' div
function addPanel(panelId, mid, desc) {
  $('#videos').append(
    '<div class="row mb-3" id="panel' + panelId + '">' +
    '	<div class="card w-100">' +
    '		<div class="card-header">' +
    '			<span class="card-title">' + (desc ? desc : "Stream") +
    '				<span class="badge bg-info hide" id="status' + mid + '"></span>' +
    '				<span class="badge bg-primary hide" id="curres' + mid + '"></span>' +
    '				<span class="badge bg-info hide" id="curbitrate' + mid + '"></span>' +
    '			</span>' +
    '		</div>' +
    '		<div class="card-body" id="mstream' + panelId + '">' +
    '			<div class="text-center">' +
    '				<div id="spinner' + mid + '" class="spinner-border" role="status">' +
    '					<span class="visually-hidden">Loading...</span>' +
    '				</div>' +
    '			</div>' +
    '		</div>' +
    '	</div>' +
    '</div>'
  );
}

// Helpers to create Simulcast-related UI, if enabled
function addSimulcastButtons(mid, streaming) {
  $('#curres' + mid).parent().append(
    '<div id="simulcast' + mid + '" class="btn-group-vertical btn-group-xs top-right">' +
    '	<div class="btn-group btn-group-xs d-flex" style="width: 100%">' +
    '		<button id="m-' + mid + '-sl-2" type="button" class="btn btn-primary" data-bs-toggle="tooltip" title="Switch to higher quality">SL 2</button>' +
    '		<button id="m-' + mid + '-sl-1" type="button" class="btn btn-primary" data-bs-toggle="tooltip" title="Switch to normal quality">SL 1</button>' +
    '		<button id="m-' + mid + '-sl-0" type="button" class="btn btn-primary" data-bs-toggle="tooltip" title="Switch to lower quality">SL 0</button>' +
    '	</div>' +
    '	<div class="btn-group btn-group-xs d-flex hide" style="width: 100%">' +
    '		<button id="m-' + mid + '-tl-2" type="button" class="btn btn-primary" data-bs-toggle="tooltip" title="Cap to temporal layer 2">TL 2</button>' +
    '		<button id="m-' + mid + '-tl-1" type="button" class="btn btn-primary" data-bs-toggle="tooltip" title="Cap to temporal layer 1">TL 1</button>' +
    '		<button id="m-' + mid + '-tl-0" type="button" class="btn btn-primary" data-bs-toggle="tooltip" title="Cap to temporal layer 0">TL 0</button>' +
    '	</div>' +
    '</div>');
  // Enable the simulcast selection buttons
  $('#m-' + mid + '-sl-0').removeClass('btn-primary btn-success').addClass('btn-primary')
    .unbind('click').click(function () {
      toastr.info("Switching simulcast substream, wait for it... (lower quality)", null, { timeOut: 2000 });
      if (!$('#m-' + mid + '-sl-2').hasClass('btn-success'))
        $('#m-' + mid + '-sl-2').removeClass('btn-primary btn-info').addClass('btn-primary');
      if (!$('#m-' + mid + '-sl-1').hasClass('btn-success'))
        $('#m-' + mid + '-sl-1').removeClass('btn-primary btn-info').addClass('btn-primary');
      $('#m-' + mid + '-sl-0').removeClass('btn-primary btn-info btn-success').addClass('btn-info');
      streaming.send({ message: { request: "configure", mid: mid, substream: 0 } });
    });
  $('#m-' + mid + '-sl-1').removeClass('btn-primary btn-success').addClass('btn-primary')
    .unbind('click').click(function () {
      toastr.info("Switching simulcast substream, wait for it... (normal quality)", null, { timeOut: 2000 });
      if (!$('#m-' + mid + '-sl-2').hasClass('btn-success'))
        $('#m-' + mid + '-sl-2').removeClass('btn-primary btn-info').addClass('btn-primary');
      $('#m-' + mid + '-sl-1').removeClass('btn-primary btn-info btn-success').addClass('btn-info');
      if (!$('#m-' + mid + '-sl-0').hasClass('btn-success'))
        $('#m-' + mid + '-sl-0').removeClass('btn-primary btn-info').addClass('btn-primary');
      streaming.send({ message: { request: "configure", mid: mid, substream: 1 } });
    });
  $('#m-' + mid + '-sl-2').removeClass('btn-primary btn-success').addClass('btn-primary')
    .unbind('click').click(function () {
      toastr.info("Switching simulcast substream, wait for it... (higher quality)", null, { timeOut: 2000 });
      $('#m-' + mid + '-sl-2').removeClass('btn-primary btn-info btn-success').addClass('btn-info');
      if (!$('#m-' + mid + '-sl-1').hasClass('btn-success'))
        $('#m-' + mid + '-sl-1').removeClass('btn-primary btn-info').addClass('btn-primary');
      if (!$('#m-' + mid + '-sl-0').hasClass('btn-success'))
        $('#m-' + mid + '-sl-0').removeClass('btn-primary btn-info').addClass('btn-primary');
      streaming.send({ message: { request: "configure", mid: mid, substream: 2 } });
    });
  // We always add temporal layer buttons too, even though these will only work with vP8
  $('#m-' + mid + '-tl-0').parent().removeClass('hide');
  $('#m-' + mid + '-tl-0').removeClass('btn-primary btn-success').addClass('btn-primary')
    .unbind('click').click(function () {
      toastr.info("Capping simulcast temporal layer, wait for it... (lowest FPS)", null, { timeOut: 2000 });
      if (!$('#m-' + mid + '-tl-2').hasClass('btn-success'))
        $('#m-' + mid + '-tl-2').removeClass('btn-primary btn-info').addClass('btn-primary');
      if (!$('#m-' + mid + '-tl-1').hasClass('btn-success'))
        $('#m-' + mid + '-tl-1').removeClass('btn-primary btn-info').addClass('btn-primary');
      $('#m-' + mid + '-tl-0').removeClass('btn-primary btn-info btn-success').addClass('btn-info');
      streaming.send({ message: { request: "configure", mid: mid, temporal: 0 } });
    });
  $('#m-' + mid + '-tl-1').removeClass('btn-primary btn-success').addClass('btn-primary')
    .unbind('click').click(function () {
      toastr.info("Capping simulcast temporal layer, wait for it... (medium FPS)", null, { timeOut: 2000 });
      if (!$('#m-' + mid + '-tl-2').hasClass('btn-success'))
        $('#m-' + mid + '-tl-2').removeClass('btn-primary btn-info').addClass('btn-primary');
      $('#m-' + mid + '-tl-1').removeClass('btn-primary btn-info').addClass('btn-info');
      if (!$('#m-' + mid + '-tl-0').hasClass('btn-success'))
        $('#m-' + mid + '-tl-0').removeClass('btn-primary btn-info').addClass('btn-primary');
      streaming.send({ message: { request: "configure", mid: mid, temporal: 1 } });
    });
  $('#m-' + mid + '-tl-2').removeClass('btn-primary btn-success').addClass('btn-primary')
    .unbind('click').click(function () {
      toastr.info("Capping simulcast temporal layer, wait for it... (highest FPS)", null, { timeOut: 2000 });
      $('#m-' + mid + '-tl-2').removeClass('btn-primary btn-info btn-success').addClass('btn-info');
      if (!$('#m-' + mid + '-tl-1').hasClass('btn-success'))
        $('#m-' + mid + '-tl-1').removeClass('btn-primary btn-info').addClass('btn-primary');
      if (!$('#m-' + mid + '-tl-0').hasClass('btn-success'))
        $('#m-' + mid + '-tl-0').removeClass('btn-primary btn-info').addClass('btn-primary');
      streaming.send({ message: { request: "configure", mid: mid, temporal: 2 } });
    });
}

function updateSimulcastButtons(mid, substream, temporal) {
  // Check the substream
  if (substream === 0) {
    toastr.success("Switched simulcast substream! (lower quality)", null, { timeOut: 2000 });
    $('#m-' + mid + '-sl-2').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#m-' + mid + '-sl-1').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#m-' + mid + '-sl-0').removeClass('btn-primary btn-info btn-success').addClass('btn-success');
  } else if (substream === 1) {
    toastr.success("Switched simulcast substream! (normal quality)", null, { timeOut: 2000 });
    $('#m-' + mid + '-sl-2').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#m-' + mid + '-sl-1').removeClass('btn-primary btn-info btn-success').addClass('btn-success');
    $('#m-' + mid + '-sl-0').removeClass('btn-primary btn-success').addClass('btn-primary');
  } else if (substream === 2) {
    toastr.success("Switched simulcast substream! (higher quality)", null, { timeOut: 2000 });
    $('#m-' + mid + '-sl-2').removeClass('btn-primary btn-info btn-success').addClass('btn-success');
    $('#m-' + mid + '-sl-1').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#m-' + mid + '-sl-0').removeClass('btn-primary btn-success').addClass('btn-primary');
  }
  // Check the temporal layer
  if (temporal === 0) {
    toastr.success("Capped simulcast temporal layer! (lowest FPS)", null, { timeOut: 2000 });
    $('#m-' + mid + '-tl-2').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#m-' + mid + '-tl-1').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#m-' + mid + '-tl-0').removeClass('btn-primary btn-info btn-success').addClass('btn-success');
  } else if (temporal === 1) {
    toastr.success("Capped simulcast temporal layer! (medium FPS)", null, { timeOut: 2000 });
    $('#m-' + mid + '-tl-2').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#m-' + mid + '-tl-1').removeClass('btn-primary btn-info btn-success').addClass('btn-success');
    $('#m-' + mid + '-tl-0').removeClass('btn-primary btn-success').addClass('btn-primary');
  } else if (temporal === 2) {
    toastr.success("Capped simulcast temporal layer! (highest FPS)", null, { timeOut: 2000 });
    $('#m-' + mid + '-tl-2').removeClass('btn-primary btn-info btn-success').addClass('btn-success');
    $('#m-' + mid + '-tl-1').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#m-' + mid + '-tl-0').removeClass('btn-primary btn-success').addClass('btn-primary');
  }
}

// Helpers to create SVC-related UI for a new viewer
function addSvcButtons(mid, streaming) {
  if ($('#svc').length > 0)
    return;
  $('#curres' + mid).parent().append(
    '<div id="svc' + mid + '" class="btn-group-vertical btn-group-vertical-xs top-right">' +
    '	<div class"row">' +
    '		<div class="btn-group btn-group-xs d-flex" style="width: 100%">' +
    '			<button id="m-' + mid + '-sl-1" type="button" class="btn btn-primary" data-bs-toggle="tooltip" title="Switch to normal resolution">SL 1</button>' +
    '			<button id="m-' + mid + '-sl-0" type="button" class="btn btn-primary" data-bs-toggle="tooltip" title="Switch to low resolution">SL 0</button>' +
    '		</div>' +
    '	</div>' +
    '	<div class"row">' +
    '		<div class="btn-group btn-group-xs d-flex" style="width: 100%">' +
    '			<button id="m-' + mid + '-tl-2" type="button" class="btn btn-primary" data-bs-toggle="tooltip" title="Cap to temporal layer 2 (high FPS)">TL 2</button>' +
    '			<button id="m-' + mid + '-tl-1" type="button" class="btn btn-primary" data-bs-toggle="tooltip" title="Cap to temporal layer 1 (medium FPS)">TL 1</button>' +
    '			<button id="m-' + mid + '-tl-0" type="button" class="btn btn-primary" data-bs-toggle="tooltip" title="Cap to temporal layer 0 (low FPS)">TL 0</button>' +
    '		</div>' +
    '	</div>' +
    '</div>'
  );
  // Enable the SVC selection buttons
  $('#m-' + mid + '-sl-0').removeClass('btn-primary btn-success').addClass('btn-primary')
    .unbind('click').click(function () {
      toastr.info("Switching SVC spatial layer, wait for it... (low resolution)", null, { timeOut: 2000 });
      if (!$('#m-' + mid + '-sl-1').hasClass('btn-success'))
        $('#m-' + mid + '-sl-1').removeClass('btn-primary btn-info').addClass('btn-primary');
      $('#m-' + mid + '-sl-0').removeClass('btn-primary btn-info btn-success').addClass('btn-info');
      streaming.send({ message: { request: "configure", mid: mid, spatial_layer: 0 } });
    });
  $('#m-' + mid + '-sl-1').removeClass('btn-primary btn-success').addClass('btn-primary')
    .unbind('click').click(function () {
      toastr.info("Switching SVC spatial layer, wait for it... (normal resolution)", null, { timeOut: 2000 });
      $('#m-' + mid + '-sl-1').removeClass('btn-primary btn-info btn-success').addClass('btn-info');
      if (!$('#m-' + mid + '-sl-0').hasClass('btn-success'))
        $('#m-' + mid + '-sl-0').removeClass('btn-primary btn-info').addClass('btn-primary');
      streaming.send({ message: { request: "configure", mid: mid, spatial_layer: 1 } });
    });
  $('#m-' + mid + '-tl-0').removeClass('btn-primary btn-success').addClass('btn-primary')
    .unbind('click').click(function () {
      toastr.info("Capping SVC temporal layer, wait for it... (lowest FPS)", null, { timeOut: 2000 });
      if (!$('#m-' + mid + '-tl-2').hasClass('btn-success'))
        $('#m-' + mid + '-tl-2').removeClass('btn-primary btn-info').addClass('btn-primary');
      if (!$('#m-' + mid + '-tl-1').hasClass('btn-success'))
        $('#m-' + mid + '-tl-1').removeClass('btn-primary btn-info').addClass('btn-primary');
      $('#m-' + mid + '-tl-0').removeClass('btn-primary btn-info btn-success').addClass('btn-info');
      streaming.send({ message: { request: "configure", mid: mid, temporal_layer: 0 } });
    });
  $('#m-' + mid + '-tl-1').removeClass('btn-primary btn-success').addClass('btn-primary')
    .unbind('click').click(function () {
      toastr.info("Capping SVC temporal layer, wait for it... (medium FPS)", null, { timeOut: 2000 });
      if (!$('#m-' + mid + '-tl-2').hasClass('btn-success'))
        $('#m-' + mid + '-tl-2').removeClass('btn-primary btn-info').addClass('btn-primary');
      $('#m-' + mid + '-tl-1').removeClass('btn-primary btn-info').addClass('btn-info');
      if (!$('#m-' + mid + '-tl-0').hasClass('btn-success'))
        $('#m-' + mid + '-tl-0').removeClass('btn-primary btn-info').addClass('btn-primary');
      streaming.send({ message: { request: "configure", mid: mid, temporal_layer: 1 } });
    });
  $('#m-' + mid + '-tl-2').removeClass('btn-primary btn-success').addClass('btn-primary')
    .unbind('click').click(function () {
      toastr.info("Capping SVC temporal layer, wait for it... (highest FPS)", null, { timeOut: 2000 });
      $('#m-' + mid + '-tl-2').removeClass('btn-primary btn-info btn-success').addClass('btn-info');
      if (!$('#m-' + mid + '-tl-1').hasClass('btn-success'))
        $('#m-' + mid + '-tl-1').removeClass('btn-primary btn-info').addClass('btn-primary');
      if (!$('#m-' + mid + '-tl-0').hasClass('btn-success'))
        $('#m-' + mid + '-tl-0').removeClass('btn-primary btn-info').addClass('btn-primary');
      streaming.send({ message: { request: "configure", mid: mid, temporal_layer: 2 } });
    });
}

function updateSvcButtons(mid, spatial, temporal) {
  // Check the spatial layer
  if (spatial === 0) {
    toastr.success("Switched SVC spatial layer! (lower resolution)", null, { timeOut: 2000 });
    $('#m-' + mid + '-sl-1').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#m-' + mid + '-sl-0').removeClass('btn-primary btn-info btn-success').addClass('btn-success');
  } else if (spatial === 1) {
    toastr.success("Switched SVC spatial layer! (normal resolution)", null, { timeOut: 2000 });
    $('#m-' + mid + '-sl-1').removeClass('btn-primary btn-info btn-success').addClass('btn-success');
    $('#m-' + mid + '-sl-0').removeClass('btn-primary btn-success').addClass('btn-primary');
  }
  // Check the temporal layer
  if (temporal === 0) {
    toastr.success("Capped SVC temporal layer! (lowest FPS)", null, { timeOut: 2000 });
    $('#m-' + mid + '-tl-2').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#m-' + mid + '-tl-1').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#m-' + mid + '-tl-0').removeClass('btn-primary btn-info btn-success').addClass('btn-success');
  } else if (temporal === 1) {
    toastr.success("Capped SVC temporal layer! (medium FPS)", null, { timeOut: 2000 });
    $('#m-' + mid + '-tl-2').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#m-' + mid + '-tl-1').removeClass('btn-primary btn-info btn-success').addClass('btn-success');
    $('#m-' + mid + '-tl-0').removeClass('btn-primary btn-success').addClass('btn-primary');
  } else if (temporal === 2) {
    toastr.success("Capped SVC temporal layer! (highest FPS)", null, { timeOut: 2000 });
    $('#m-' + mid + '-tl-2').removeClass('btn-primary btn-info btn-success').addClass('btn-success');
    $('#m-' + mid + '-tl-1').removeClass('btn-primary btn-success').addClass('btn-primary');
    $('#m-' + mid + '-tl-0').removeClass('btn-primary btn-success').addClass('btn-primary');
  }
}
