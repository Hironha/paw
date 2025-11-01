export type Pretty<T> = { [K in keyof T]: T[K] } & {};

export type MergeRecord<B extends Record<any, any>, T extends Record<any, any>> = Omit<B, keyof T> &
  T;
