export const getPingColorClass = (ping: number) => {
  if (ping >= 300) {
    return "text-[#AF0808] dark:text-[#F98585]";
  }

  if (ping >= 200) {
    return "text-[#943400] dark:text-[#FF7E38]";
  }

  if (ping >= 100) {
    return "text-[#6A4C06] dark:text-[#DC9D09]";
  }

  if (ping >= 20) {
    return "text-[#165F3B] dark:text-[#2CBA77]";
  }

  return "text-[#51514D] dark:text-[#AAA7A7]";
};
