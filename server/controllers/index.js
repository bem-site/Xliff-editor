const parseGHUrl = require('parse-github-url');
const md2xliff = require('md2xliff');
const renderer = require('../renderer');

const Segment = require('../db').Segment;
const helpers = require('../helpers');

const { env } = process;

const { onError, onAjaxError } = helpers.errors;

function getContent(req, res) {
    const query = req.query;
    const doc = query.doc;
    const filename = doc.split('/').pop();

    const passport = req.session.passport || {};
    env.GITHUB_TOKEN || (env.GITHUB_TOKEN = passport.user && passport.user.token);

    if (!doc) return renderer(req, res, {
        view: 'blank',
        pageTitle: 'cataria'
    });

    return helpers.github.getContent(doc)
        .then(function(docText) {
            const extract = md2xliff.extract(docText, filename, filename.replace(/\.md$/, '.skl'), query.sourceLang, query.targetLang);
            const { srcLang, trgLang, units } = extract.data;

            return helpers.translator.getTM(trgLang, srcLang, units)
                .then(units => {
                    renderer(req, res, {
                        view: 'index-page',
                        pageTitle: 'cataria',
                        segments: units,
                        sourceLang: srcLang,
                        targetLang: trgLang,
                        user: passport.user,
                        repo: doc
                    });
                });
        })
        .catch(err => { onError(req, res, err); });
}

function createPullRequest(req, res) {
    const { data, doc, targetFile } = req.body;
    const user = req.session.passport.user;
    const firstSegment = JSON.parse(data)[0];
    const sourceLang = firstSegment.source.lang.slice(0, 2); // ru-Ru -> ru
    const targetLang = firstSegment.target.lang.slice(0, 2);

    const pathToDoc = doc.split(parseGHUrl(doc).branch)[1].substr(1);
    const filename = pathToDoc.split('/').pop();

    const translationFilename = filename.replace('.' + sourceLang + '.', '.' + targetLang  + '.');
    const newBranch = `cat_${filename}`;

    env.GITHUB_TOKEN || (env.GITHUB_TOKEN = user.token);

    return helpers.github.getContent(doc)
        .then(docText => {
            const extract = md2xliff.extract(docText, filename, filename.replace(/\.md$/, '.skl'), req.query.sourceLang, req.query.targetLang);
            return md2xliff.reconstruct(JSON.parse(data), extract.skeleton);
        })
        .then(translatedText => helpers.github.createPR(doc, user.login, newBranch, {
            path: targetFile || pathToDoc.replace(filename, '') + translationFilename,
            content: translatedText,
            message: `Update translation for ${filename}`
        }))
        .then(status => res.send(`<a href="${status.html_url}">Pull request</a> successfully created.`))
        .catch(err => { onAjaxError(req, res, err); });
}

function saveMemory(req, res) {
    const data = JSON.parse(req.body.data);
    const promises = data.map(helpers.translator.saveTM);

    return Promise.all(promises)
        .then(() => res.send('Segments successfully created!'))
        .catch(err => onAjaxError(req, res, err));
}

function updateTM(req, res) {
    const data = JSON.parse(req.body.data);
    const srcLang = data[0].source.lang;
    const trgLang = data[0].target.lang;

    helpers.translator.getTM(trgLang, srcLang, data)
        .then(units => {
            renderer(req, res, {
                segments: units,
                sourceLang: srcLang,
                targetLang: trgLang
            }, { block: 'editor' })
        })
        .catch(err => { onError(req, res, err); });
}

function getYaTranslate(req, res) {
    const data = JSON.parse(req.body.data);
    const srcLang = data[0].source.lang;
    const trgLang = data[0].target.lang;

    const promises = data.map(helpers.translator.getYaTranslate);

    return Promise.all(promises)
        .then(units => {
            renderer(req, res, {
                segments: units,
                sourceLang: srcLang,
                targetLang: trgLang
            }, { block: 'editor' })
        })
        .catch(err => { onError(req, res, err); });
}

module.exports = {
    // /?doc=https://github.com/bem/bem-method/blob/bem-info-data/articles/bem-for-small-projects/bem-for-small-projects.ru.md
    getContent,
    createPullRequest,
    saveMemory,
    updateTM,
    getYaTranslate
};
