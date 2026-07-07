const Elastic = {
  easeOut(t: number): number {
    if (t === 0 || t === 1) return t;
    return 2 ** (-10 * t) * Math.sin(((t * 10 - 0.75) * (2 * Math.PI)) / 3) + 1;
  },
};

export default Elastic;
