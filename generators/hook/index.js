'use strict';
const Generator = require('yeoman-generator');
const _chalk = require('chalk');
const _yosay = require('yosay');
const _path = require('path');

const _globby = require('globby');
const _prompts = require('../../utils/prompts');
const _consts = require('../../utils/constants');
const _package = require('../../package.json');

module.exports = class extends Generator {
    /**
     * Initialize the generator.
     */
    constructor(args, opts) {
        super(args, opts);

        this._apiList = [];
    }

    /**
     * Generate a list of APIs that have already been created.
     */
    generateApiList() {
        return _globby(this.destinationPath('templates/'), {
            onlyDirectories: true,
            deep: false
        }).then((dirList) => {
            this._apiList = dirList.map((dir) => _path.basename(dir));
            if(this._apiList.length <= 0) {
                this.env.error('This project does not have any APIs to assign hooks to');
            }
        });
    }

    /**
     * Gather information about the hook
     */
    gatherHookInfo() {
        return _prompts
            .getProjectInfo(this, false)
            .then(() => {
                return this.prompt([
                    {
                        type: 'list',
                        name: 'hookApi',
                        message: `Which API?`,
                        choices: this._apiList,
                        validate: (answer) => {
                            if (this._apiList.indexOf(answer) >= 0) {
                                return true;
                            }
                            return 'Please select an API to add the hook to';
                        }
                    },
                    {
                        type: 'list',
                        name: 'hookType',
                        choices: [
                            'pre-install',
                            'post-install',
                            'pre-delete',
                            'post-delete',
                            'pre-upgrade',
                            'post-upgrade',
                            'pre-rollback',
                            'post-rollback',
                            'crd-install'
                        ],
                        message: 'Hook type?',
                        default: 'post-install'
                    },
                    {
                        type: 'input',
                        name: 'hookWeight',
                        message: 'Hook priority?',
                        validate: (answer) => {
                            if (!isNaN(parseInt(answer))) {
                                return true;
                            }
                            return 'Hook priority must be a number';
                        },
                        filter: (answer) => parseInt(answer),
                        default: 10
                    },
                    {
                        type: 'input',
                        name: 'hookImage',
                        message: 'Hook image?',
                        validate: (input, answers) => {
                            if (input.length >= 0) {
                                return true;
                            } else {
                                return 'Please provide a valid API image name';
                            }
                        }
                    },
                    {
                        type: 'input',
                        name: 'hookFileGlob',
                        message: 'Hook data file glob (leave empty if none)?'
                    },
                    {
                        type: 'input',
                        name: 'hookCommand',
                        message: 'Hook command and args (comma separated)?',
                        filter: (answer) => {
                            if (answer instanceof Array) {
                                return answer;
                            }
                            return answer
                                .split(',')
                                .map((keyword) => `${keyword.trim()}`)
                                .filter((keyword) => !!keyword);
                        },
                        default: []
                    }
                ]);
            })
            .then((props) => {
                this.props = this.props || {};
                Object.keys(props).forEach((key) => {
                    this.props[key] = props[key];
                });
            });
    }

    /**
     * Shows a the title of the sub generator, and a brief description.
     */
    showTitle() {
        this.log(_consts.SEPARATOR);

        if (!this.options.title) {
            const title = `${_consts.GENERATOR_NAME} v${_package.version}`;
            const subTitle = 'Add hook to existing API';
            this.log(
                _yosay(
                    `Helm Chart Generator.\n${_chalk.red(
                        title
                    )}\n${_chalk.yellow(subTitle)}`
                )
            );
        } else {
            this.log(this.options.title);
        }
    }

    /**
     * Creates project files
     */
    createProjectFiles() {
        const { hookApi, hookType, hookFileGlob } = this.props;
        const srcFiles = ['templates/_api/_hook/job.yaml'];

        if (hookFileGlob) {
            srcFiles.push('templates/_api/_hook/config.yaml');
        }

        srcFiles.forEach((srcFile) => {
            const destFile = srcFile
                .replace(/^_/, '.')
                .replace(/\/_api\//, `/${hookApi}/`)
                .replace(/\/_hook\//, `/${hookType}/`);

            this.fs.copyTpl(
                this.templatePath(srcFile),
                this.destinationPath(destFile),
                this.props
            );
        });
    }

    /**
     * Update the helper template with some definitions specific to the hook.
     */
    updateHelperTemplates() {
        const { hookApi, hookImage, hookType, projectName } = this.props;
        const helperFile = this.destinationPath('templates/_helpers.tpl');
        const helperTemplate = Buffer.from(`
{{/*
Container image for ${hookApi}:${hookType}
*/}}
{{- define "${projectName}.${hookApi}.${hookType}.image" }}${hookImage}{{- end -}}
`);

        this.fs.copy(helperFile, helperFile, {
            process: (content) => {
                return Buffer.concat([content, helperTemplate]);
            }
        });
    }

    /**
     * Display completed message with future actions.
     */
    finish() {
        this.props = this.props || {};
        const { hookType, hookApi, hookFileGlob } = this.props;
        const messages = [
            '',
            _consts.SEPARATOR,
            ` Hook of type ${hookType} has been added to the API ${hookApi}                  `,
            ''
        ];
        if(hookFileGlob) {
            messages.push(` The hook will attempt to load files ${hookFileGlob} from the data directory.   `);
            messages.push(` Please place relevant files in this directory prior to building the chart.     `);
        } else {
            messages.push(` The hook does not require any data, and none will be mounted.                  `);
        }

        messages.push(_consts.SEPARATOR);
        messages.push('');
        messages.forEach((line) => this.log(line));
    }
};
