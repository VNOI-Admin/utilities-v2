export const removeURLSearch = (url: URL, searchParamsToRemove: (string | [string, string])[]) => {
  const newUrl = new URL(url);
  for (const removeSearch of searchParamsToRemove) {
    if (typeof removeSearch === "string") {
      newUrl.searchParams.delete(removeSearch);
    } else {
      newUrl.searchParams.delete(removeSearch[0], removeSearch[1]);
    }
  }
  return newUrl;
};
