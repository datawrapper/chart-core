let __notifications = [];

function notify(notification) {
    __notifications.push(notification);
    try {
        window.parent.dw.backend.fire('notifications.change', __notifications);
        return () => {
            __notifications = __notifications.filter(d => d !== notification);
            window.parent.dw.backend.fire('notifications.change', __notifications);
        };
    } catch (ex) {
        /* not in editor, do nothing */
    }
}
export default notify;
