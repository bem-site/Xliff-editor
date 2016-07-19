const Segment = require('../db').Segment;
const md2xliff = require('md2xliff');
const GitHubApi = require('../GitHubApi');
const Promise = require('pinkie-promise');
const renderer = require('../renderer');

function getMemory(req, res) {
    const { owner, repo, path } = req.query;
    const tree = 'bem-info-data'; // TODO: default_branch tree как узнать!!!!
    const passport = req.session.passport || {};
    const token = passport.user && passport.user.token;

    return GitHubApi.getContent(owner, repo, tree, path, token)
        .then(function(data) {
            const xliff = md2xliff.extract(data.data);
            const { srcLang, trgLang, units } = xliff.data;
            const context = { block: 'editor' };

            return Promise.all(units.map(unit => {
                const $search = `"${unit.source.content}"`;
                const $text = { $search };
                const target_lang = trgLang;
                const source_lang = srcLang;
                const query = { target_lang, source_lang, $text };

                return Segment.find(query, { weight: { $meta: 'textScore' } })
                    .sort({ weight: { $meta: 'textScore' } })
                    .exec()
                    .then((data) => {
                        if (data.length) unit.target.content = data[0].target;

                        return unit;
                    })
            })).then((data) => {
                renderer(req, res, {
                    segments: data,
                    sourceLang: srcLang,
                    targetLang: trgLang,
                    user: passport.user,
                    repo: {
                        name: repo,
                        path: path
                    }
                }, context);
            });
        });
}

function saveMemory(req, res) {
    const data = JSON.parse(req.body.data);
    Segment.collection.insert(data, (err, data) => {
        if (err) throw err;

        res.send('Segment successfully created!');
    });
}

function getTranslate(req, res) {

}

module.exports = {
    getMemory: getMemory,
    saveMemory: saveMemory,
    getTranslate: getTranslate
};
