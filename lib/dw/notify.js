let __notifications = [];

function notify(notification) {
    const id = new Date().getTime();
    notification.id = new Date().getTime();
    __notifications.push(notification);
    let dwBackend;

    if (dw.backend) {
        dwBackend = dw.backend;
    }
    if (window.parent.dw && window.parent.dw.backend) {
        dwBackend = window.parent.dw.backend;
    }
    if (dwBackend) {
        dwBackend.fire('notifications.change', __notifications);
        return () => {
            __notifications = __notifications.filter(d => d.id !== id);
            dwBackend.fire('notifications.change', __notifications);
        };
    }
}
export default notify;
