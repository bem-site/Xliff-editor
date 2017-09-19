block('panel').content()((node) => {
    const data = node.data;
    const repo = data.repo || {};

    return [
        {
            elem: 'info',
            content: [
                {
                    elem: 'info-title',
                    content: 'File path: '
                },
                repo
            ]
        },
        {
            elem: 'header',
            content: [
                {
                    elem: 'side',
                    mix: { block: 'editor-unit', elem: 'item' },
                    content: 'Text in the original language: ' + data.sourceLang
                },
                {
                    elem: 'side',
                    mix: { block: 'editor-unit', elem: 'item' },
                    content: 'Text in the target language: ' + data.targetLang
                }
            ]
        }
    ];
});
