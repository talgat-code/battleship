let context:AudioContext|undefined;
export function sonarPing(card='sonar'){
  if(localStorage.getItem('fleet:muted')==='true')return;
  try{context ||= new AudioContext();void context.resume();const oscillator=context.createOscillator(),gain=context.createGain();
    const frequency=card==='kraken'?85:card==='bomb'?140:card==='chance'?620:card==='signal'?980:780;
    oscillator.type=card==='kraken'||card==='bomb'?'triangle':'sine';
    oscillator.frequency.setValueAtTime(frequency,context.currentTime);oscillator.frequency.exponentialRampToValueAtTime(card==='chance'?1100:frequency*.3,context.currentTime+.5);
    gain.gain.setValueAtTime(.045,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.6);
    oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.6);
  }catch{/* Optional sound cannot interrupt an action. */}
}
