declare module "canvas-confetti" {
  type ConfettiOptions = {
    particleCount?: number;
    spread?: number;
    origin?: { x?: number; y?: number };
    [key: string]: any;
  };

  function confetti(opts?: ConfettiOptions | any): void;

  export default confetti;
}
