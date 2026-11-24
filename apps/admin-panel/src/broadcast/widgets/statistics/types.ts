export interface StackedBarValue {
  color: string;
  caption: string;
  value: number;
}

export interface StackedBar {
  name: string;
  values: StackedBarValue[];
}
