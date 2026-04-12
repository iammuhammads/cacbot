export class KeyedSerialQueue {
  private chains = new Map<string, Promise<unknown>>();

  enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.chains.get(key) ?? Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(task)
      .finally(() => {
        if (this.chains.get(key) === current) {
          this.chains.delete(key);
        }
      });

    this.chains.set(key, current);
    return current;
  }
}

