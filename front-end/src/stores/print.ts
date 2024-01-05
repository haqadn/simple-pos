import { defineStore } from "pinia";

type PrintType = "bill" | "kot";
type PrintData = any;
export type Job = {
  type: PrintType;
  data: PrintData;
  resolve: () => void;
};

export const usePrintStore = defineStore("prints", {
  state: () => ({
    queue: [] as Array<Job>,
  }),
  actions: {
    push(type: PrintType, data: PrintData) {
      return new Promise<void>((resolve) => {
        this.queue.push({ type, data, resolve });
      });
    },
    pop() {
      // Take the first element of the queue, adjust the queue and return the element
      const [first, ...rest] = this.queue;
      this.queue = rest;
      first.resolve();
    },
  },
  getters: {
    nextJob(): Job | undefined {
      // Return the first element of the queue
      return this.queue[0];
    },
  },
});
