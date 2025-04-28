FROM debian:12

ENV DIR_BUILD=/tmp/build
WORKDIR /app

RUN mkdir -p ${DIR_BUILD}

RUN apt-get update && apt-get install -y --fix-missing \
  libmicrohttpd-dev \
  libjansson-dev \
  libnice-dev \
  libssl-dev \
  libsofia-sip-ua-dev \
  libglib2.0-dev \
  libopus-dev \
  libogg-dev \
  libcurl4-openssl-dev \
  liblua5.3-dev \
  libconfig-dev \
  pkg-config \
  gengetopt \
  libtool \
  automake \
  gtk-doc-tools \
  doxygen \
  graphviz \
  libnanomsg-dev \
  libunwind-dev \
  cmake \
  golang-go

RUN apt-get install -y wget \
  && apt-get install -y vim \
  && apt-get install -y git \
  && apt-get install -y curl

RUN PATH="/usr/local/bin:$PATH"
RUN apt-get install -y python3-pip
RUN yes | pip3 install --break-system-packages meson ninja

RUN cd ${DIR_BUILD} \
  && git clone https://gitlab.freedesktop.org/libnice/libnice -b 0.1.22 --depth=1 \
  && cd ./libnice \
  && meson --prefix=/usr --buildtype=release build \
  && ninja -C build \
  && ninja -C build install

RUN cd ${DIR_BUILD} \
  && git clone https://boringssl.googlesource.com/boringssl -b 0.20250415.0 --depth=1 \
  && cd boringssl \
  && sed -i s/" -Werror"//g CMakeLists.txt \
  && mkdir -p build \
  && cd build \
  && cmake -DCMAKE_INSTALL_PREFIX=/opt/boringssl -DCMAKE_CXX_FLAGS="-lrt" .. \
  && make install

RUN cd ${DIR_BUILD} \
  && wget https://github.com/cisco/libsrtp/archive/v2.3.0.tar.gz \
  && tar xfv v2.3.0.tar.gz \
  && cd libsrtp-2.3.0 \
  && ./configure --prefix=/usr --enable-openssl \
  && make shared_library \
  && make install

RUN cd ${DIR_BUILD} \
  && git clone https://github.com/sctplab/usrsctp -b 0.9.5.0 --depth=1 \
  && cd ./usrsctp \
  && ./bootstrap \
  && ./configure --prefix=/usr --libdir=/usr/lib \
  && make \
  && make install

RUN cd ${DIR_BUILD} \
  && git clone https://libwebsockets.org/repo/libwebsockets -b v4.3-stable --depth=1 \
  && cd ./libwebsockets \
  && mkdir build \
  && cd ./build \
  && cmake -DLWS_MAX_SMP=1 \
        -DLWS_WITHOUT_EXTENSIONS=0 \
        -DCMAKE_INSTALL_PREFIX:PATH=/usr \
        -DCMAKE_C_FLAGS="-fpic" .. \
  && make \
  && make install

RUN cd ${DIR_BUILD} \
  && git clone https://github.com/meetecho/janus-gateway.git -b v1.3.1 --depth=1 \
  && cd janus-gateway \
  && sh autogen.sh \
  && ./configure --prefix=/opt/janus \
  && make install
