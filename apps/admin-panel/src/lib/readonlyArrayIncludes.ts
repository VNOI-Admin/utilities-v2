/**
 * Determines whether an array includes a certain element, returning true or false as appropriate.
 *
 * @param readonlyArray - The array of type `ReadonlyArray<T>`
 * @param searchElement - The element to search for.
 * @returns
 */
export const readonlyArrayIncludes = <T extends U, U>(
  readonlyArray: readonly T[],
  searchElement: U,
): searchElement is T => readonlyArray.includes(searchElement as T);
