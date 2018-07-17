'use strict';
const Generator = require('yeoman-generator');
const _chalk = require('chalk');
const _yosay = require('yosay');

const _prompts = require('../../utils/prompts');
const _consts = require('../../utils/constants');
const _package = require('../../package.json');

module.exports = class extends Generator {
    /**
     * Gather basic project information.
     */
    gatherProjectInfo() {
        const generatorTitle = `${_consts.GENERATOR_NAME} v${_package.version}`;
        this.log(
            _yosay(`Helm Chart Generator.\n${_chalk.red(generatorTitle)} `)
        );

        return _prompts.getProjectInfo(this, true).then(() => {
            return _prompts.getAuthorInfo(this, true);
        });
    }

    /**
     * Creates project files
     */
    createProjectFiles() {
        [
            'Chart.yaml',
            'values.yaml',
            'charts/_keep',
            'data/_keep',
            'README.md',
            '_gitignore',
            '_helmignore',
            '_prettierrc',

            'templates/NOTES.txt',
            'templates/_helpers.tpl'
        ].forEach((srcFile) => {
            const destFile = srcFile
                .replace(/^_/, '.')
                .replace(/\/_keep/, '/.keep');
            this.fs.copyTpl(
                this.templatePath(srcFile),
                this.destinationPath(destFile),
                this.props
            );
        });
    }

    /**
     * Finish the rest of the main flow by composing sub generators.
     */
    compose() {
        this.composeWith(`${_consts.GENERATOR_NAME}:${_consts.SUB_GEN_API}`, {
            title: 'Add an API to your microservice'
        });
    }
};
