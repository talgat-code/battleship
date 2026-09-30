// Development-only browser fixture; not imported by the production entry.
import {createRoot} from 'react-dom/client';
import Board from '../../src/Board';
import EmotionBar from '../../src/emotions/EmotionBar';
import {AudioProvider,SoundButton} from '../../src/Audio';
import {I18n} from '../../src/i18n';
import '../../src/style.css';
createRoot(document.getElementById('root')!).render(<I18n><AudioProvider><SoundButton/><div style={{width:'min(95vw,480px)',margin:'20px auto'}}><Board data={{ships:[],shots:[]}} enemy active onCell={()=>{}} label="Поле противника" moving={false} controls={<EmotionBar room={{id:'00000000-0000-0000-0000-000000000001',round:1}}/>}/></div></AudioProvider></I18n>);
