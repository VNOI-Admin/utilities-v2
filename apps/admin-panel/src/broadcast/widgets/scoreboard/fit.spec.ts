import { fitScale } from './fit';

describe('fitScale', () => {
  it('keeps text that fits at full width', () => {
    expect(fitScale(100, { paddingLeft: '0px', paddingRight: '0px' }, 80)).toBe(1);
  });

  it('shrinks text into the box content width, not the padded width', () => {
    expect(fitScale(71, { paddingLeft: '0px', paddingRight: '20px' }, 60)).toBeCloseTo(51 / 60);
  });

  it('leaves text alone while the box has no width yet', () => {
    expect(fitScale(0, { paddingLeft: '0px', paddingRight: '0px' }, 60)).toBe(1);
  });
});
