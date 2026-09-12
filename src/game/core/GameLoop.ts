/** Фиксированные шаги симуляции; частота кадров влияет только на отрисовку. */
export class GameLoop {
  readonly step = 1 / 20;
  private accumulator = 0;
  get alpha() { return this.accumulator / this.step; }
  reset() { this.accumulator = 0; }
  advance(delta: number, speed: number, update: (step: number) => void) {
    // После фоновой вкладки не пытаемся мгновенно проиграть пропущенные минуты.
    this.accumulator += Math.min(Math.max(delta, 0), 0.25) * speed;
    while (this.accumulator + 1e-10 >= this.step) {
      update(this.step);
      this.accumulator = Math.max(0, this.accumulator - this.step);
    }
  }
}
