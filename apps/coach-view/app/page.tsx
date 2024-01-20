'use client';

import React from "react";
import Navbar from "./components/Navbar";
import VideoJS from "./components/VideoJS";
import videojs from "video.js";

export default function Page(): JSX.Element {
  const playerRef = React.useRef(null);
  const videoJsOptions = {
    autoplay: true,
    controls: true,
    sources: [{
      src: 'http://localhost:9090/video.ogg',
      type: 'video/ogg'
    }]
  };

  const handlePlayerReady = (player) => {
    playerRef.current = player;

    // You can handle player events here, for example:
    player.on('waiting', () => {
      videojs.log('player is waiting');
    });

    player.on('dispose', () => {
      videojs.log('player will dispose');
    });
  };
  return (
    <>
      <Navbar />
      <main>
        {/* <VideoJS options={videoJsOptions} onReady={handlePlayerReady} /> */}

      <video width="1600" height="900" autoPlay loop id="video-background" muted>
        <source src="http://localhost:9090/video.ogg" type="video/ogg" />
      </video>
      </main>
    </>
  );
}
