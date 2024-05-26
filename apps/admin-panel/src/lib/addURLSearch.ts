export const addURLSearch = (url: URL, searchParams: [string, string][]) => {
  const newUrl = new URL(url);
  for (const [key, value] of searchParams) {
    newUrl.searchParams.append(key, value);
  }
  return newUrl;
};
