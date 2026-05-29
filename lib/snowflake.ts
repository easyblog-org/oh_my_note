export class SnowflakeIdGenerator {
  private epoch: bigint = BigInt(1700000000000);
  private workerId: bigint;
  private sequence: bigint = 0n;
  private lastTimestamp: bigint = -1n;

  constructor(workerId?: number) {
    this.workerId = BigInt(workerId ?? Math.floor(Math.random() * 1024));
  }

  nextId(): string {
    let timestamp = BigInt(Date.now());

    if (timestamp === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & 4095n;
      if (this.sequence === 0n) {
        timestamp = this.waitNextMillis(timestamp);
      }
    } else {
      this.sequence = 0n;
    }

    this.lastTimestamp = timestamp;

    const id = ((timestamp - this.epoch) << 22n)
      | (this.workerId << 12n)
      | this.sequence;

    return id.toString();
  }

  private waitNextMillis(lastTimestamp: bigint): bigint {
    let timestamp = BigInt(Date.now());
    while (timestamp <= lastTimestamp) {
      timestamp = BigInt(Date.now());
    }
    return timestamp;
  }
}

const snowflake = new SnowflakeIdGenerator();

export function generateSlug(): string {
  return snowflake.nextId();
}
