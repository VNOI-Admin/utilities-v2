<script lang="ts">
  import "video.js/dist/video-js.min.css";

  import videojs from "video.js";

  import { invalidate } from "$app/navigation";
    import noAvatar from "$images/no-avatar.webp";
  import { getPingColorClass } from "$lib/getPingColorClass";
  import { getUsageColorClass } from "$lib/getUsageColorClass";
  import { toast } from "$lib/stores/toast.svelte";

  import CpuRamChart from "./CpuRamChart.svelte";

  const { data } = $props();

  const ip = $derived(data.ip);

  $effect(() => {
    const interval = setInterval(() => invalidate("contestant:data:info"), 10000);

    return () => clearInterval(interval);
  });

  let video = $state<HTMLVideoElement | null>(null);
  let player = $state<ReturnType<typeof videojs> | null>(null);
  let offlineWarned = false;

  $effect(() => {
    if (video) {
      player = videojs(video, {
        html5: {
          hls: {
            overrideNative: true,
          },
        },
        controls: false,
        autoplay: "any",
        preload: "auto",
        fill: true,
        liveui: true,
      });
    }

    return () => player?.dispose();
  });

  const reloadVideo = () => {
    if (player) {
      player.src({
        src: `/${ip}/stream.m3u8`,
        type: "application/x-mpegURL",
      });
      player.load();
    }
  };

  $effect(reloadVideo);

  $effect(() => {
    if (data.isOnline === undefined) {
      return;
    }
    if (data.isOnline) {
      offlineWarned = false;
      return;
    }
    if (!offlineWarned) {
      toast.push({
        variant: "info",
        time: Date.now(),
        title: "Status",
        message: `User ${data.userId} has gone offline.`,
      });
      offlineWarned = true;
    }
  });
</script>

<div class="flex h-full w-full flex-col gap-4 p-4 md:p-10">
  <div
    class="dark:bg-neutral-1000 flex w-full flex-row items-center gap-4 rounded-xl bg-white px-4 py-2 shadow-lg"
  >
    <img
      src={noAvatar}
      class="max-h-[150px] min-h-[150px] min-w-[150px] max-w-[150px] rounded-full"
      alt=""
      width={150}
      height={150}
    />
    <div>
      <h1>
        <span class="sr-only">Contestant </span>{data.userId} - {data.fullName}
      </h1>
      <h2>
        Online: {data.isOnline ? "✅" : "❌"}
        {#if data.ping !== undefined}
          {@const pingColor = getPingColorClass(data.ping)}
          • Ping: <span class={pingColor}>{data.ping}ms</span>
        {/if}
      </h2>
    </div>
  </div>
  <div class="flex h-full w-full flex-col gap-[inherit] lg:flex-row">
    {#if data.cpu !== undefined && data.ram !== undefined}
      {@const cpuColor = getUsageColorClass(data.cpu)}
      {@const ramColor = getUsageColorClass(data.ram)}
      <div class="flex w-full flex-[1_1_0] flex-col gap-4">
        <div
          class="dark:bg-neutral-1000 flex w-full flex-col gap-4 rounded-xl bg-white p-4 shadow-lg lg:flex-[1_1_0] lg:overflow-x-auto"
        >
          <h3>
            CPU usage <span class={cpuColor}>{data.cpu}%</span>
          </h3>
          <div class="w-full max-w-[500px] overflow-y-auto">
            <CpuRamChart
              chartType="cpu"
              chartWidth={500}
              chartHeight={200}
              chartLabel="CPU%"
              chartUsage={data.cpu}
            />
          </div>
        </div>
        <div
          class="dark:bg-neutral-1000 flex w-full flex-col gap-4 rounded-xl bg-white p-4 shadow-lg lg:flex-[1_1_0] lg:overflow-x-auto"
        >
          <h3>
            RAM usage <span class={ramColor}>{data.ram}%</span>
          </h3>
          <div class="w-full max-w-[500px] overflow-y-auto">
            <CpuRamChart
              chartType="ram"
              chartWidth={500}
              chartHeight={200}
              chartLabel="RAM%"
              chartUsage={data.ram}
            />
          </div>
        </div>
      </div>
    {/if}
    <div
      class="dark:bg-neutral-1000 flex h-[50dvh] w-full flex-col gap-4 rounded-xl bg-white p-4 shadow-lg lg:h-[unset] lg:flex-[2_2_0] lg:overflow-x-auto"
    >
      <div class="flex w-full flex-row items-center justify-between">
        <h3>Video</h3>
        <button class="button filled" onclick={reloadVideo}>Reload stream</button>
      </div>
      <video bind:this={video} class="video-js w-full rounded-xl shadow-lg" id="player">
        <track kind="captions" />
      </video>
    </div>
  </div>
</div>
