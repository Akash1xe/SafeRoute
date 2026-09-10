interface QueueEntry<T> {
  value: T;
  priority: number;
}

export class MinPriorityQueue<T> {
  private readonly heap: QueueEntry<T>[] = [];

  get size(): number {
    return this.heap.length;
  }

  enqueue(value: T, priority: number): void {
    this.heap.push({ value, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): QueueEntry<T> | undefined {
    const first = this.heap[0];
    const last = this.heap.pop();
    if (!first || !last) return first;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return first;
  }

  private bubbleUp(index: number): void {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (
        (this.heap[parent]?.priority ?? Infinity) <=
        (this.heap[current]?.priority ?? Infinity)
      ) {
        break;
      }
      [this.heap[parent], this.heap[current]] = [
        this.heap[current]!,
        this.heap[parent]!,
      ];
      current = parent;
    }
  }

  private sinkDown(index: number): void {
    let current = index;
    while (true) {
      const left = current * 2 + 1;
      const right = left + 1;
      let smallest = current;
      if (
        (this.heap[left]?.priority ?? Infinity) <
        (this.heap[smallest]?.priority ?? Infinity)
      ) {
        smallest = left;
      }
      if (
        (this.heap[right]?.priority ?? Infinity) <
        (this.heap[smallest]?.priority ?? Infinity)
      ) {
        smallest = right;
      }
      if (smallest === current) return;
      [this.heap[current], this.heap[smallest]] = [
        this.heap[smallest]!,
        this.heap[current]!,
      ];
      current = smallest;
    }
  }
}
