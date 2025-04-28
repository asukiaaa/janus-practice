# janus-practice

## Requirements

- docker

## Setup

```sh
docker compose up
```

## Send live stream to 5004 port as vp8 format

```sh
ffmpeg -f v4l2 \
  -pix_fmt uyvy422 \
  -video_size 640x480 \
  -framerate 15 \
  -i /dev/video0 \
  -an -c:v libvpx -deadline realtime -f rtp rtp://localhost:5004
```

## References

[ffmpeg publishing VP8 to Janus Gateway 100% CPU MBP](https://stackoverflow.com/questions/37590331/ffmpeg-publishing-vp8-to-janus-gateway-100-cpu-mbp)
