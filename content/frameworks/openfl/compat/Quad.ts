const Quad = {
  easeOut(t: number): number {
    return 1 - (1 - t) * (1 - t);
  },
};

export default Quad;
