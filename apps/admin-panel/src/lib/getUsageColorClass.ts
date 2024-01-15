export const getUsageColorClass = (usage: number) => {
	if (usage >= 80) {
		return "text-[#AF0808] dark:text-[#F98585]";
	}

	if (usage >= 60) {
		return "text-[#943400] dark:text-[#FF7E38]";
	}

	if (usage >= 40) {
		return "text-[#6A4C06] dark:text-[#DC9D09]";
	}

	if (usage >= 20) {
		return "text-[#165F3B] dark:text-[#2CBA77]";
	}

	return "text-[#51514D] dark:text-[#AAA7A7]";
};
