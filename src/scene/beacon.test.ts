import { expect,it } from 'vitest';
import { Vector3 } from 'three';
import { beaconDirection,BEACON_TILT } from './beacon';
it('shares the exact rotor direction at all four quarters',()=>{
  for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
    const actual=new Vector3(1,0,0).applyAxisAngle(new Vector3(0,0,1),-Math.atan(BEACON_TILT)).applyAxisAngle(new Vector3(0,1,0),angle);
    expect(actual.distanceTo(beaconDirection(angle))).toBeLessThan(1e-10);
  }
});
