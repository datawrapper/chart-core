import purifyHtml from '@datawrapper/shared/purifyHtml';

export function clean(s) {
    return purifyHtml(s, '<a><span><b><br><br/><i><strong><sup><sub><strike><u><em><tt>');
}
