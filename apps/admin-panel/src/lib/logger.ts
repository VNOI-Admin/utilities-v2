import picocolors from "picocolors";

export const log = (text: string, ...message: any[]) => {
  console.log(picocolors.white(picocolors.bold(text)), ...message);
};

export const error = (text: string, ...message: any[]) => {
  console.error(picocolors.red(picocolors.bold(text)), ...message);
};

export const warn = (text: string, ...message: any[]) => {
  console.warn(picocolors.yellow(picocolors.bold(text)), ...message);
};

export const success = (text: string, ...message: any[]) => {
  console.log(picocolors.green(picocolors.bold(text)), ...message);
};
