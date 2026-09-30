import {Component,type ReactNode} from 'react';
export const graphicsOff=()=>new URLSearchParams(location.search).get('graphics')==='off';
export class SceneBoundary extends Component<{children:ReactNode;fallback?:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  lost=()=>this.setState({failed:true});
  componentDidMount(){window.addEventListener('webglcontextlost',this.lost,true);}
  componentWillUnmount(){window.removeEventListener('webglcontextlost',this.lost,true);}
  render(){return this.state.failed||graphicsOff()?this.props.fallback||null:this.props.children;}
}
export class AppBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<main className="recovery-screen"><h1>Не удалось открыть игру</h1><p>Ошибка интерфейса или графики. Сохранения не удалены. Попробуйте безопасный режим без 3D.</p><a href="?recovery=login&graphics=off">Войти без 3D</a><a href="?recovery=guest&graphics=off">Играть гостем без 3D</a><button onClick={()=>location.reload()}>Повторить загрузку</button></main>:this.props.children;}
}
