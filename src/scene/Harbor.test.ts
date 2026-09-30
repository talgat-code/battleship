import { expect,it } from 'vitest';
import { cruisePose } from './Harbor';
it('keeps the decorative cruise on a smooth closed route below the interface',()=>{
  const period=2*Math.PI/.055;
  for(const mobile of [true,false]) {
    const start=cruisePose(0,mobile),end=cruisePose(period,mobile);
    expect(end.x).toBeCloseTo(start.x,9);expect(end.z).toBeCloseTo(start.z,9);
    for(let t=0;t<period;t+=.1){const a=cruisePose(t,mobile),b=cruisePose(t+.016,mobile);expect(Math.abs(a.x)).toBeLessThanOrEqual(mobile?1.1:5.5);expect(a.z).toBeGreaterThanOrEqual(10.2);expect(a.z).toBeLessThanOrEqual(10.8);expect(Math.hypot(a.x-b.x,a.z-b.z)).toBeLessThan(.006);}
  }
});
