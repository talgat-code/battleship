let context:AudioContext|undefined;
export function sonarPing(){
  if(localStorage.getItem('fleet:muted')==='true')return;
  try{context ||= new AudioContext();void context.resume();const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.frequency.setValueAtTime(780,context.currentTime);oscillator.frequency.exponentialRampToValueAtTime(260,context.currentTime+.5);
    gain.gain.setValueAtTime(.045,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.6);
    oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.6);
  }catch{/* Optional sound cannot interrupt an action. */}
}
