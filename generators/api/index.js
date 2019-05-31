'use strict';
const Generator = require('yeoman-generator');
const _chalk = require('chalk');
const _yosay = require('yosay');

const _prompts = require('../../utils/prompts');
const _consts = require('../../utils/constants');
const _package = require('../../package.json');

module.exports = class extends Generator {
    /**
     * Shows a the title of the sub generator, and a brief description.
     */
    showTitle() {
        this.log(_consts.SEPARATOR);

        if (!this.options.title) {
            const title = `${_consts.GENERATOR_NAME} v${_package.version}`;
            const subTitle = 'Add new API to chart';
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
     * Gather basic project information.
     */
    gatherProjectInfo() {
        return _prompts
            .getProjectInfo(this, false)
            .then(() => {
                return _prompts.getAuthorInfo(this, false);
            })
            .then(() => {
                return this.prompt([
                    {
                        type: 'input',
                        name: 'apiName',
                        message: 'Api name?',
                        default: 'my-api'
                    },
                    {
                        type: 'input',
                        name: 'apiRoutePrefix',
                        message: 'Api route prefix?',
                        filter: (answer) => {
                            if (answer.indexOf('/') !== 0) {
                                return `/${answer}`;
                            }
                            return answer;
                        },
                        default: '/'
                    },
                    {
                        type: 'input',
                        name: 'apiPort',
                        message: 'Port number on which API listens?',
                        filter: (answer) => parseInt(answer),
                        validate: (input) => {
                            if (!isNaN(parseInt(input))) {
                                return true;
                            }
                            return 'Please provide a valid port number';
                        },
                        default: 3000
                    },
                    {
                        type: 'confirm',
                        name: 'apiJwtEnabled',
                        message: 'Enable JWT authentication?',
                        default: true
                    },
                    {
                        type: 'input',
                        name: 'apiJwtIssuer',
                        message: 'JWT issuer?',
                        default: 'ADI',
                        when: (answers) => !!answers.apiJwtEnabled
                    },
                    {
                        type: 'input',
                        name: 'apiImage',
                        message: 'Api image?',
                        validate: (input, answers) => {
                            if (input.length >= 0) {
                                return true;
                            }
                            return 'Please provide a valid API image name';
                        }
                    }
                ]).then((props) => {
                    this.props = this.props || {};
                    Object.keys(props).forEach((key) => {
                        this.props[key] = props[key];
                    });
                });
            });
    }

    /**
     * Creates project files
     */
    createProjectFiles() {
        const { apiName, apiJwtEnabled } = this.props;
        const files = [
            'templates/_api/config.yaml',
            'templates/_api/deployment.yaml',
            'templates/_api/service.yaml',
            'templates/_api/virtual-service.yaml'
        ];
        if (apiJwtEnabled) {
            files.push('templates/_api/policy.yaml');
        }
        files.forEach((srcFile) => {
            const destFile = srcFile
                .replace(/^_/, '.')
                .replace(/\/_api\//, `/${apiName}/`);

            this.fs.copyTpl(
                this.templatePath(srcFile),
                this.destinationPath(destFile),
                this.props
            );
        });

        this.fs.copyTpl(
            this.templatePath('data/_config.json'),
            this.destinationPath(`data/${apiName}-config.json`),
            this.props
        );
    }

    /**
     * Update the helper template with some definitions specific to the API.
     */
    updateHelperTemplates() {
        const { apiName, apiImage, projectName } = this.props;
        const helperFile = this.destinationPath('templates/_helpers.tpl');
        const helperTemplate = Buffer.from(`
{{/*
Container image for ${apiName}
*/}}
{{- define "${projectName}.${apiName}.image" }}${apiImage}{{- end -}}
`);

        this.fs.copy(helperFile, helperFile, {
            process: (content) => {
                return Buffer.concat([content, helperTemplate]);
            }
        });
    }

    /**
     * Update the values.yaml file with the api value defaults
     */
    updateValues() {
        const { apiRoutePrefix, apiJwtEnabled, apiJwtIssuer } = this.props;
        const valuesFile = this.destinationPath('values.yaml');
        let values = [
            `api:`,
            `  hosts:`,
            `    - '"*"'`,
            `  routePrefix: ${apiRoutePrefix}`
        ];
        if (apiJwtEnabled) {
            values = values.concat([`  jwt:`, `    issuer: ${apiJwtIssuer}`]);
        }
        values = values.concat([
            `  image:`,
            `      defaultPullPolicy: IfNotPresent`,
            `  replicaCount: 1`,
            `  resources: {}`,
            `    # We usually recommend not to specify default resources and to leave this as a conscious`,
            `    # choice for the user. This also increases chances charts run on environments with little`,
            `    # resources, such as Minikube. If you do want to specify resources, uncomment the following`,
            `    # lines, adjust them as necessary, and remove the curly braces after 'resources:'.`,
            `    # limits:`,
            `    #  cpu: 100m`,
            `    #  memory: 128Mi`,
            `    # requests:`,
            `    #  cpu: 100m`,
            `    #  memory: 128Mi`
        ]);
        const valuesTemplate = Buffer.from(values.join('\n'));
        this.fs.copy(valuesFile, valuesFile, {
            process: (content) => {
                return Buffer.concat([content, valuesTemplate]);
            }
        });
    }

    /**
     * Display completed message with future actions.
     */
    finish() {
        const messages = [
            '',
            _consts.SEPARATOR,
            ` Kubernetes resources for your api have been added.                             `,
            ` Optional lifecycle hooks can be created by running:                            `,
            '',
            `   yo ${
                _consts.GENERATOR_NAME
            }:hook                                            `,
            _consts.SEPARATOR,
            ''
        ];

        messages.forEach((line) => this.log(line));
    }
};
