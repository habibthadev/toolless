type QueuedTask<T> = () => Promise<T>;

export class WriteQueue {
  private queue: Promise<unknown> = Promise.resolve();

  enqueue<T>(task: QueuedTask<T>): Promise<T> {
    const result = this.queue.then(task, task);
    this.queue = result.catch(() => {});
    return result;
  }
}
