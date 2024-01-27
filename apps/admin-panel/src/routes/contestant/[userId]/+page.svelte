<script lang="ts">
  import videojs from "video.js";
  import { invalidate } from "$app/navigation";
  import noAvatar from "$images/no-avatar.webp";
  import { getUsageColorClass } from "$lib/getUsageColorClass";

  import type { PageData } from "./$types";
  import CpuRamChart from "./CpuRamChart.svelte";
  import { onDestroy, onMount } from "svelte";
  import "video.js/dist/video-js.min.css";

  const { data } = $props<{ data: PageData }>();

  const cpuUsage = $derived(data.cpu),
    ramUsage = $derived(data.ram);

  $effect(() => {
    const interval = setInterval(() => invalidate("contestant:data:info"), 10000);

    return () => clearInterval(interval);
  });

  let player: any;

  onMount(() => {
    player = videojs("player", {
      controls: false,
      autoplay: true,
      preload: "auto",
      fluid: true,
      liveui: true,
    });
  });

  onDestroy(() => {
    if (player) player.dispose();
  });
</script>

<div class="flex w-full flex-col gap-4 p-2 md:p-10">
  <div
    class="dark:bg-neutral-1000 flex w-full flex-row items-center gap-8 rounded-xl bg-white px-4 py-2 shadow-lg"
  >
    <img
      src={noAvatar}
      class="h-[150px] w-[150px] rounded-full"
      alt=""
      width={150}
      height={150}
    />
    <div>
      <h1>
        <span class="sr-only">Contestant </span>{data.userId}
      </h1>
      <h2>
        IP: {data.ip} • Online: {data.isOnline ? "✅" : "❌"} • Ping: {data.ping}ms
      </h2>
    </div>
  </div>
  <div class="flex w-full flex-col gap-4 md:flex-row md:flex-wrap">
    <div
      class="dark:bg-neutral-1000 flex w-full flex-col gap-4 rounded-xl bg-white p-4 shadow-lg md:flex-[1_1_0] md:overflow-x-auto"
    >
      <h2>
        CPU usage <span class={getUsageColorClass(cpuUsage)}>{cpuUsage}%</span>
      </h2>
      <div class="w-full max-w-[500px] overflow-y-auto">
        <CpuRamChart
          chartType="cpu"
          chartWidth={500}
          chartHeight={200}
          chartLabel="CPU%"
          chartUsage={cpuUsage}
        />
      </div>
    </div>
    <div
      class="dark:bg-neutral-1000 flex w-full flex-col gap-4 rounded-xl bg-white p-4 shadow-lg md:flex-[1_1_0] md:overflow-x-auto"
    >
      <h2>
        RAM usage <span class={getUsageColorClass(ramUsage)}>{ramUsage}%</span>
      </h2>
      <div class="w-full max-w-[500px] overflow-y-auto">
        <CpuRamChart
          chartType="ram"
          chartWidth={500}
          chartHeight={200}
          chartLabel="RAM%"
          chartUsage={ramUsage}
        />
      </div>
    </div>
  </div>
  <!-- <video class="w-full rounded-xl shadow-lg bg-gray-100 video-js" id="player" autoplay loop controls>
    <source src={`http://${data.ip}:100/stream.ogg`} type="video/ogg" />
    <track kind="captions" />
  </video> -->
  <!-- make video view with height fill parent without scrolling -->
  <div class="flex w-full flex-col gap-4 md:flex-row md:flex-wrap">
    <div
      class="dark:bg-neutral-1000 flex w-full flex-col gap-4 rounded-xl bg-white p-4 shadow-lg md:flex-[1_1_0] md:overflow-x-auto"
    >
      <h2>Video</h2>
      <div class="w-full max-w-[900px] overflow-y-auto">
        <video
          class="w-full rounded-xl shadow-lg bg-gray-100 video-js"
          id="player"
          autoplay
          loop
          controls
        >
          <source
            src={`http://${data.ip}:100/stream.ogg`}
            type="video/ogg"
          />
          <track kind="captions" />
        </video>
      </div>
    </div>
  </div>
</div>

<!-- <style>
  @import url("https://cdn.jsdelivr.net/npm/video.js/dist/video-js.min.css");
</style> -->
