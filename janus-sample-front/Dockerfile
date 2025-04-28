FROM node:23-bullseye

WORKDIR /app

RUN apt install -y git
RUN npm install -g local-web-server -y
RUN git clone https://github.com/meetecho/janus-gateway.git -b v1.3.1 --depth=1
