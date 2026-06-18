import React from 'react';
import { PartProvider } from './store/PartContext';
import './app.scss';

function App({ children }: { children: React.ReactNode }) {
  return <PartProvider>{children}</PartProvider>;
}

export default App;
