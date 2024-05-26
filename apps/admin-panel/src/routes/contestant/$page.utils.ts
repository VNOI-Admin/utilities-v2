import type { OrderBy } from "./$page.types";

export const convertOrderByValueToText = (orderByValue: OrderBy) => {
  switch (orderByValue) {
    case "userid":
      return "ID";
    case "username":
      return "Username";
    case "cpu":
      return "CPU";
    case "ip":
      return "IP";
    case "memory":
      return "RAM";
    case "ping":
      return "Ping";
    default: {
      const _unhandled: never = orderByValue;
      throw new Error(`${convertOrderByValueToText.name}: Unhandled orderByValue ${_unhandled}`);
    }
  }
};
