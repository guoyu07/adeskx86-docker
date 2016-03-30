FROM mimi/x86:0.l

MAINTAINER mimi 86194@sangfor.com 

RUN apt-get update && apt-get -y install openbox && \
	apt-get install -y xterm && \
	apt-get install -y x11-xserver-utils && \
	apt-get install -y --no-install-recommends aptitude && \
	apt-get install -y --no-install-recommends dpkg-dev && \
	apt-get install -y mplayer2 && \
	apt-get install -y compton && \
	apt-get install -y zip && \
	apt-get install -y tcpdump && \
	apt-get install -y sysstat && \
	apt-get install -y alsa-utils && \
	apt-get install -y xfonts-wqy && \
	apt-get install -y fcitx && \
	apt-get install -y plymouth && \
	apt-get install -y plymouth-themes && \
	apt-get install -y curl && \
	apt-get install -y  --no-install-recommends xfce4-power-manager && \
	apt-get install -y  --no-install-recommends gdb && \
	apt-get install -y  wireless-tools && \
	apt-get install -y  openssh-server 

