export class Random {
  static value(): number {
    return Math.random();
  }

  static range(min: number, max: number): number {
    return Random.value() * (max - min) + min;
  }

  static integer(min: number, max: number): number {
    return Math.floor(Random.value() * (max - min + 1)) + min;
  }

  static chance(probabilityOfTrue: number = 0.5): boolean {
    return Random.value() < probabilityOfTrue;
  }

  static angleRadians(): number {
    return Random.value() * 2 * Math.PI;
  }

  static angleDegrees(): number {
    return Random.value() * 360;
  }

  static sign(probabilityOf1: number = 0.5): number {
    return Random.chance(probabilityOf1) ? 1 : -1;
  }

  static choice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    return array[Math.floor(Random.value() * array.length)];
  }
}
