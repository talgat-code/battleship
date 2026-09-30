import React from 'react';
import ReactDOM from 'react-dom/client';
import Entry from './account/Entry';
import { AudioProvider } from './Audio';
import './style.css';
import './twilight.css';
import './world.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AudioProvider><Entry /></AudioProvider></React.StrictMode>);
