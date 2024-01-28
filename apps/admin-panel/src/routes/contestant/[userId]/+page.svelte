<script lang="ts">
  import "video.js/dist/video-js.min.css";

  import videojs from "video.js";

  import { invalidate } from "$app/navigation";
  import noAvatar from "$images/no-avatar.webp";
  import { getPingColorClass } from "$lib/getPingColorClass";
  import { getUsageColorClass } from "$lib/getUsageColorClass";

  import type { PageData } from "./$types";
  import CpuRamChart from "./CpuRamChart.svelte";
  import Button from "$components/Button.svelte";

  const { data } = $props<{ data: PageData }>();

  const cpuColor = $derived(getUsageColorClass(data.cpu));
  const ramColor = $derived(getUsageColorClass(data.ram));
  const pingColor = $derived(getPingColorClass(data.ping));

  $effect(() => {
    const interval = setInterval(() => invalidate("contestant:data:info"), 10000);

    return () => clearInterval(interval);
  });

  let video = $state<HTMLVideoElement | null>(null);

  $effect(() => {
    let player: ReturnType<typeof videojs> | null = null;

    if (video) {
      player = videojs(video, {
        controls: false,
        autoplay: true,
        preload: "auto",
        fill: true,
        liveui: true,
      });
    }

    return () => player?.dispose();
  });
</script>

<div class="flex h-full w-full flex-col gap-4 p-4 md:p-10">
  <div
    class="dark:bg-neutral-1000 flex w-full flex-row items-center gap-8 rounded-xl bg-white px-4 py-2 shadow-lg"
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
        <span class="sr-only">Contestant </span>{data.userId}
      </h1>
      <h2>
        IP: {data.ip} • Online: {data.isOnline ? "✅" : "❌"} • Ping: <span class={pingColor}>{data.ping}ms</span>
      </h2>
    </div>
  </div>
  <div class="flex h-full w-full flex-col gap-[inherit] lg:flex-row">
    <div class="flex w-full flex-col gap-4 basis-1/3">
      <div
        class="dark:bg-neutral-1000 flex w-full flex-col gap-4 rounded-xl bg-white p-4 shadow-lg lg:flex-[1_1_0] lg:overflow-x-auto"
      >
        <h2>
          CPU usage <span class={cpuColor}>{data.cpu}%</span>
        </h2>
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
        <h2>
          RAM usage <span class={ramColor}>{data.ram}%</span>
        </h2>
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
    <!-- make video view with height fill parent without scrolling -->
    <div class="flex w-full flex-col gap-4 basis-2/3">
      <div
        class="dark:bg-neutral-1000 flex w-full flex-col gap-4 rounded-xl bg-white p-4 shadow-lg lg:flex-[1_1_0] lg:overflow-x-auto"
      >
        <h2>Video</h2>
        <video
          bind:this={video}
          class="video-js w-full rounded-xl bg-gray-100 shadow-lg"
          id="player"
          autoplay
          loop
          controls
        >
          <source src={`http://${data.ip}:100/stream.ogg`} type="video/ogg" />
          <track kind="captions" />
        </video>
      </div>
    </div>
  </div>
</div>
