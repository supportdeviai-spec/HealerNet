import React from 'react';
import { createRoot } from 'react-dom/client';
import AppRoutes from './routes/AppRoutes';

const container = document.getElementById('app');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <AppRoutes />
        </React.StrictMode>
    );
}
