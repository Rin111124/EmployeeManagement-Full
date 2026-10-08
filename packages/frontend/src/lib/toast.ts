type ToastType = 'success' | 'error' | 'info';
type ToastOptions = { duration?: number };

export function toast(message: string, typeOrOpts?: ToastType | ToastOptions, maybeOpts?: ToastOptions) {
    let type: ToastType = 'info';
    let opts: ToastOptions = {};

    if (typeof typeOrOpts === 'string') {
        type = typeOrOpts as ToastType;
        opts = maybeOpts || {};
    } else if (typeof typeOrOpts === 'object') {
        opts = typeOrOpts;
    }

    const id = `toast-${Date.now()}`;
    const container = document.createElement('div');
    container.id = id;
    container.style.position = 'fixed';
    container.style.right = '20px';
    container.style.top = '20px';
    container.style.zIndex = '9999';
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6'
    };
    const bgColor = colors[type] || colors.info;

    const content = document.createElement('div');
    content.style.background = bgColor;
    content.style.color = '#fff';
    content.style.padding = '12px 18px';
    content.style.borderRadius = '8px';
    content.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
    content.style.fontWeight = '500';
    content.style.minWidth = '200px';
    content.textContent = message;
    container.appendChild(content);
    document.body.appendChild(container);
    
    setTimeout(() => {
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.5s ease';
        setTimeout(() => container.remove(), 500);
    }, opts.duration || 4000);
}

export default toast;
