export const addURLSearch = (url: URL, searchParams: Record<string, string>) => {
  return new URL(
    `${url.origin}${url.pathname}?${new URLSearchParams({ ...Object.fromEntries(url.searchParams.entries()), ...searchParams })}`,
  );
};
