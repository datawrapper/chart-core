import { Parser } from './parser';
import purifyHtml from '@datawrapper/shared/purifyHtml';

const TPL_REG = /\{\{(.+?)\}\}/g;
const ALLOWED_TAGS =
    '<a><span><b><br><br/><i><strong><sup><sub><strike><u><em><tt><h1><h2><h3><h4><h5><h6><ul><ol><li><p><table><tr><td><th><tbody><thead><hr>';
/*
 * returns a function that evaluates template strings
 * using `expr-eval`.
 */
export default function htmlTemplate(template) {
    const expressions = {};
    const parser = new Parser();
    template.replace(TPL_REG, (s, formula) => {
        formula = formula.trim();
        if (formula && !expressions[formula]) {
            expressions[formula] = parser.parse(formula);
        }
    });
    return context =>
        purifyHtml(
            template.replace(TPL_REG, (s, formula) =>
                formula.trim() ? expressions[formula.trim()].evaluate(context) : ''
            ),
            ALLOWED_TAGS
        );
}
