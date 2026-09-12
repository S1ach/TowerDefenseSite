import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GamePage } from '../pages/game/GamePage';
import './styles.css';
import { Provider } from 'react-redux';
import { store } from './store/store';

createRoot(document.getElementById('root')!).render(<StrictMode><Provider store={store}><GamePage /></Provider></StrictMode>);
