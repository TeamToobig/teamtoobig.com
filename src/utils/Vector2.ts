
export class Vector2 {
  constructor(public x: number = 0, public y: number = 0) {}

  static from(x: number, y: number): Vector2 {
    return new Vector2(x, y);
  }

  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  static fromAngle(angleRadians: number, magnitude: number = 1): Vector2 {
    return new Vector2(
      Math.cos(angleRadians) * magnitude,
      Math.sin(angleRadians) * magnitude
    );
  }

  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  normalized(): Vector2 {
    const mag = this.magnitude();
    return mag > 0 ? new Vector2(this.x / mag, this.y / mag) : Vector2.zero();
  }

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  angleRadians(): number {
    return Math.atan2(this.y, this.x);
  }

  copy(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  distanceTo(other: Vector2): number {
    return this.subtract(other).magnitude();
  }

  lerp(other: Vector2, t: number): Vector2 {
    return new Vector2(
      this.x + (other.x - this.x) * t,
      this.y + (other.y - this.y) * t
    );
  }

  equals(other: Vector2, epsilon: number = 0.0001): boolean {
    return Math.abs(this.x - other.x) < epsilon && Math.abs(this.y - other.y) < epsilon;
  }

  toString(): string {
    return `Vector2(${this.x.toFixed(3)}, ${this.y.toFixed(3)})`;
  }
}
